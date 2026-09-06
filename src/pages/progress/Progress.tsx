import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Bar, BarChart, Cell, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '../../lib/supabase'
import { PageShell } from '../../components/PageShell'
import type { Activity, ActivityType } from '../../types/database'

// Only these types record weight + reps + RPE/RIR on a set.
const CHARTABLE_TYPES: ActivityType[] = ['strength', 'power', 'anaerobic']

const EFFORT_COLORS = {
  red: '#ef4444',
  orange: '#f97316',
  yellow: '#eab308',
  green: '#22c55e',
  none: '#64748b',
}

// RIR = 10 - RPE under the standard autoregulation scale, so RPE and RIR
// share the same three near-limit buckets; anything easier than that is
// lumped into "green" since the gradation only matters near failure.
function effortColor(rpe: number | undefined, rir: number | undefined) {
  const effectiveRir = rir ?? (rpe != null ? 10 - rpe : undefined)
  if (effectiveRir == null) return EFFORT_COLORS.none
  if (effectiveRir <= 0) return EFFORT_COLORS.red
  if (effectiveRir <= 1) return EFFORT_COLORS.orange
  if (effectiveRir <= 2) return EFFORT_COLORS.yellow
  return EFFORT_COLORS.green
}

function useChartableActivities() {
  return useQuery({
    queryKey: ['activities'],
    queryFn: async () => {
      const { data, error } = await supabase.from('activities').select('*').order('sort_order').order('name')
      if (error) throw error
      return (data as Activity[]).filter((a) => CHARTABLE_TYPES.includes(a.type))
    },
  })
}

interface WorkSetPoint {
  date: string
  weight: number
  reps: number
  rpe?: number
  rir?: number
  completedAt: string
}

function useWorkSetHistory(activityId: string | null) {
  return useQuery({
    queryKey: ['progress_work_sets', activityId],
    enabled: Boolean(activityId),
    queryFn: async (): Promise<WorkSetPoint[]> => {
      const { data: sessionActivitiesRaw, error: saError } = await supabase
        .from('session_activities')
        .select('id, session_phases(sessions(session_date))')
        .eq('activity_id', activityId as string)
      if (saError) throw saError
      // The untyped client can't know these embeds are to-one (a session_activity
      // belongs to exactly one phase, which belongs to exactly one session), so it
      // infers them as arrays — they're single objects at runtime.
      const sessionActivities = sessionActivitiesRaw as unknown as { id: string; session_phases: { sessions: { session_date: string } } }[]

      const dateBySessionActivityId = new Map<string, string>()
      for (const sa of sessionActivities ?? []) {
        const date = sa.session_phases?.sessions?.session_date
        if (date) dateBySessionActivityId.set(sa.id, date)
      }
      const sessionActivityIds = [...dateBySessionActivityId.keys()]
      if (sessionActivityIds.length === 0) return []

      const { data: actualSets, error: asError } = await supabase
        .from('actual_sets')
        .select('*')
        .in('session_activity_id', sessionActivityIds)
        .eq('details->>set_kind', 'work')
      if (asError) throw asError

      return (actualSets ?? [])
        .map((row) => {
          const details = row.details as Record<string, unknown>
          return {
            date: dateBySessionActivityId.get(row.session_activity_id) as string,
            weight: Number(details.target_weight_lbs ?? 0),
            reps: Number(details.target_reps_max ?? details.target_reps_min ?? 0),
            rpe: details.target_rpe != null ? Number(details.target_rpe) : undefined,
            rir: details.target_rir != null ? Number(details.target_rir) : undefined,
            completedAt: row.completed_at as string,
          }
        })
        .filter((p) => p.date && p.weight > 0)
        .sort((a, b) => (a.completedAt < b.completedAt ? -1 : 1))
    },
  })
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
      {label}
    </span>
  )
}

export default function Progress() {
  const [activityId, setActivityId] = useState<string | null>(null)
  const { data: activities } = useChartableActivities()
  const { data: points, isLoading } = useWorkSetHistory(activityId)

  const chartData = (points ?? []).map((p) => ({ ...p, label: format(new Date(p.date), 'M/d') }))

  return (
    <PageShell title="Progress" description="Work-set history for a chosen exercise.">
      <label className="mb-6 block">
        <span className="mb-1 block text-sm font-medium text-slate-200">Exercise</span>
        <select
          value={activityId ?? ''}
          onChange={(e) => setActivityId(e.target.value || null)}
          className="w-full rounded-md bg-slate-800 px-3 py-2"
        >
          <option value="">Select an exercise…</option>
          {(activities ?? []).map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>

      {!activityId && <p className="text-sm text-slate-400">Pick an exercise to see its work-set history.</p>}
      {activityId && isLoading && <p className="text-sm text-slate-400">Loading…</p>}
      {activityId && !isLoading && chartData.length === 0 && (
        <p className="text-sm text-slate-400">No work sets recorded yet for this exercise.</p>
      )}

      {chartData.length > 0 && (
        <>
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <BarChart data={chartData}>
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={12}
                  label={{ value: 'lbs', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
                />
                <Tooltip
                  contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', color: '#e2e8f0' }}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  formatter={
                    ((value: number, _name: string, props: { payload: WorkSetPoint }) => {
                      const p = props.payload
                      const effort = p.rir != null ? `${p.rir} RIR` : p.rpe != null ? `RPE ${p.rpe}` : 'no effort logged'
                      return [`${value} lbs × ${p.reps} reps @ ${effort}`, 'Set']
                    }) as any
                  }
                />
                <Bar dataKey="weight">
                  {chartData.map((p, i) => (
                    <Cell key={i} fill={effortColor(p.rpe, p.rir)} />
                  ))}
                  <LabelList
                    dataKey="reps"
                    position="top"
                    formatter={((v: number) => `${v} reps`) as any}
                    fill="#e2e8f0"
                    fontSize={11}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
            <LegendDot color={EFFORT_COLORS.red} label="0 RIR / RPE 10" />
            <LegendDot color={EFFORT_COLORS.orange} label="1 RIR / RPE 9" />
            <LegendDot color={EFFORT_COLORS.yellow} label="2 RIR / RPE 8" />
            <LegendDot color={EFFORT_COLORS.green} label="3+ RIR / RPE ≤7" />
            <LegendDot color={EFFORT_COLORS.none} label="No RPE/RIR logged" />
          </div>
        </>
      )}
    </PageShell>
  )
}
