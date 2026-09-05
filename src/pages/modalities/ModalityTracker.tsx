import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { addWeeks, endOfWeek, format, startOfWeek, subWeeks } from 'date-fns'
import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { supabase } from '../../lib/supabase'
import { PageShell } from '../../components/PageShell'
import type { Modality } from '../../types/database'

const GOAL_DAYS = 2

function useModalities() {
  return useQuery({
    queryKey: ['modalities'],
    queryFn: async () => {
      const { data, error } = await supabase.from('modalities').select('*').order('sort_order')
      if (error) throw error
      return data as Modality[]
    },
  })
}

// A modality counts for a day only if a set was actually performed that day
// (actual_sets present), not merely planned.
function useWeekModalityDays(weekStart: string, weekEnd: string) {
  return useQuery({
    queryKey: ['modality_days', weekStart, weekEnd],
    queryFn: async () => {
      const { data: rawData, error } = await supabase
        .from('sessions')
        .select(
          `session_date,
           session_phases(session_activities(activities(activity_modalities(modality_id)), actual_sets(id)))`,
        )
        .gte('session_date', weekStart)
        .lte('session_date', weekEnd)
      if (error) throw error
      // The untyped client can't know activities/activity_modalities are to-one
      // from this side, so it infers arrays throughout — they're single objects
      // at runtime (a session_activity has exactly one activity).
      const data = rawData as unknown as {
        session_date: string
        session_phases: {
          session_activities: {
            actual_sets: { id: string }[]
            activities: { activity_modalities: { modality_id: string }[] }
          }[]
        }[]
      }[]

      const daysByModality = new Map<string, Set<string>>()
      for (const session of data ?? []) {
        const date = session.session_date as string
        for (const phase of session.session_phases ?? []) {
          for (const sa of phase.session_activities ?? []) {
            if (!sa.actual_sets || sa.actual_sets.length === 0) continue
            for (const am of sa.activities?.activity_modalities ?? []) {
              const days = daysByModality.get(am.modality_id) ?? new Set<string>()
              days.add(date)
              daysByModality.set(am.modality_id, days)
            }
          }
        }
      }
      return daysByModality
    },
  })
}

export default function ModalityTracker() {
  const [weekAnchor, setWeekAnchor] = useState(new Date())
  const weekStartDate = startOfWeek(weekAnchor, { weekStartsOn: 0 })
  const weekEndDate = endOfWeek(weekAnchor, { weekStartsOn: 0 })
  const weekStart = format(weekStartDate, 'yyyy-MM-dd')
  const weekEnd = format(weekEndDate, 'yyyy-MM-dd')

  const { data: modalities } = useModalities()
  const { data: daysByModality, isLoading } = useWeekModalityDays(weekStart, weekEnd)

  const chartData = (modalities ?? []).map((m) => ({
    modality: m.label,
    days: daysByModality?.get(m.id)?.size ?? 0,
  }))

  return (
    <PageShell title="Modalities" description="Days trained per modality, Sunday through Saturday.">
      <div className="mb-6 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setWeekAnchor((d) => subWeeks(d, 1))}
          className="rounded-md bg-slate-800 px-3 py-1.5 text-sm text-slate-200"
        >
          ← Prev
        </button>
        <span className="text-sm text-slate-300">
          {format(weekStartDate, 'MMM d')} – {format(weekEndDate, 'MMM d, yyyy')}
        </span>
        <button
          type="button"
          onClick={() => setWeekAnchor((d) => addWeeks(d, 1))}
          className="rounded-md bg-slate-800 px-3 py-1.5 text-sm text-slate-200"
        >
          Next →
        </button>
      </div>

      {isLoading && <p className="text-sm text-slate-400">Loading…</p>}

      {!isLoading && (
        <div className="h-80 w-full">
          <ResponsiveContainer>
            <BarChart data={chartData} margin={{ bottom: 40 }}>
              <XAxis dataKey="modality" stroke="#94a3b8" fontSize={12} angle={-30} textAnchor="end" interval={0} />
              <YAxis stroke="#94a3b8" fontSize={12} domain={[0, 7]} allowDecimals={false} />
              <ReferenceLine
                y={GOAL_DAYS}
                stroke="#38bdf8"
                strokeDasharray="4 4"
                label={{ value: `Goal: ${GOAL_DAYS}+ days`, fill: '#38bdf8', fontSize: 11, position: 'insideTopRight' }}
              />
              <Bar dataKey="days">
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.days >= GOAL_DAYS ? '#22c55e' : '#64748b'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </PageShell>
  )
}
