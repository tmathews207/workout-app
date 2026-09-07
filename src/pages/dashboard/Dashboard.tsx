import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { addWeeks, endOfWeek, format, startOfWeek, subDays, subWeeks } from 'date-fns'
import {
  Bar,
  BarChart,
  Cell,
  Legend,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { supabase } from '../../lib/supabase'
import type { Activity, ActivityType, Modality, NutritionLog } from '../../types/database'
import { caffeineTotal, fruitTotal, milkTotal, vegetableTotal, waterTotal } from '../../lib/nutritionTotals'

const DAYS = 14
const GOAL_DAYS = 2
const CHARTABLE_TYPES: ActivityType[] = ['strength', 'power', 'anaerobic']

const AXIS = '#94a3b8'
const GRID_TOOLTIP = { background: '#0f172a', border: '1px solid #1e293b', color: '#e2e8f0' }
const LEGEND_STYLE = { fontSize: 12, color: '#94a3b8' }

const EFFORT_COLORS = { red: '#ef4444', orange: '#f97316', yellow: '#eab308', green: '#22c55e', none: '#64748b' }

function effortColor(rpe: number | undefined, rir: number | undefined) {
  const effectiveRir = rir ?? (rpe != null ? 10 - rpe : undefined)
  if (effectiveRir == null) return EFFORT_COLORS.none
  if (effectiveRir <= 0) return EFFORT_COLORS.red
  if (effectiveRir <= 1) return EFFORT_COLORS.orange
  if (effectiveRir <= 2) return EFFORT_COLORS.yellow
  return EFFORT_COLORS.green
}

function Card({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-slate-950 p-4">
      <h2 className="text-base font-medium text-slate-100">{title}</h2>
      {subtitle && <p className="mb-3 mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      <div className={subtitle ? '' : 'mt-3'}>{children}</div>
    </div>
  )
}

function useSleepTrend() {
  return useQuery({
    queryKey: ['sleep_trend', DAYS],
    queryFn: async () => {
      const since = format(subDays(new Date(), DAYS - 1), 'yyyy-MM-dd')
      const { data, error } = await supabase
        .from('sleep_logs')
        .select('log_date, quality, wearable_sleep_score')
        .gte('log_date', since)
        .order('log_date')
      if (error) throw error
      return (data ?? []) as { log_date: string; quality: number | null; wearable_sleep_score: number | null }[]
    },
  })
}

function useWeightTrend() {
  return useQuery({
    queryKey: ['weight_trend', DAYS],
    queryFn: async () => {
      const since = format(subDays(new Date(), DAYS - 1), 'yyyy-MM-dd')
      const { data, error } = await supabase
        .from('weight_logs')
        .select('log_date, period, weight_lbs')
        .gte('log_date', since)
        .order('log_date')
      if (error) throw error
      return (data ?? []) as { log_date: string; period: 'morning' | 'evening'; weight_lbs: number }[]
    },
  })
}

function useNutritionTrend() {
  return useQuery({
    queryKey: ['nutrition_trend', DAYS],
    queryFn: async () => {
      const since = format(subDays(new Date(), DAYS - 1), 'yyyy-MM-dd')
      const { data, error } = await supabase.from('nutrition_logs').select('*').gte('log_date', since).order('log_date')
      if (error) throw error
      return (data ?? []) as NutritionLog[]
    },
  })
}

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

export default function Dashboard() {
  const [weekAnchor, setWeekAnchor] = useState(new Date())
  const weekStartDate = startOfWeek(weekAnchor, { weekStartsOn: 0 })
  const weekEndDate = endOfWeek(weekAnchor, { weekStartsOn: 0 })
  const weekStart = format(weekStartDate, 'yyyy-MM-dd')
  const weekEnd = format(weekEndDate, 'yyyy-MM-dd')

  const [activityId, setActivityId] = useState<string | null>(null)

  const { data: sleepData } = useSleepTrend()
  const { data: weightData } = useWeightTrend()
  const { data: nutritionData } = useNutritionTrend()
  const { data: modalities } = useModalities()
  const { data: daysByModality } = useWeekModalityDays(weekStart, weekEnd)
  const { data: activities } = useChartableActivities()
  const { data: workSetPoints } = useWorkSetHistory(activityId)

  const sleepChartData = (sleepData ?? []).map((row) => ({
    label: format(new Date(row.log_date), 'M/d'),
    subjective: row.quality != null ? row.quality * 10 : null,
    objective: row.wearable_sleep_score,
  }))

  const weightByDate = new Map<string, { label: string; morning?: number; evening?: number }>()
  for (const row of weightData ?? []) {
    const entry = weightByDate.get(row.log_date) ?? { label: format(new Date(row.log_date), 'M/d') }
    entry[row.period] = row.weight_lbs
    weightByDate.set(row.log_date, entry)
  }
  const weightChartData = [...weightByDate.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([, v]) => v)
  const weights = weightChartData.flatMap((d) => [d.morning, d.evening]).filter((w): w is number => w != null)
  const weightMin = weights.length ? Math.min(...weights) : 0
  const weightMax = weights.length ? Math.max(...weights) : 0

  const nutritionChartData = (nutritionData ?? []).map((log) => ({
    label: format(new Date(log.log_date), 'M/d'),
    water: waterTotal(log),
    milk: milkTotal(log),
    fruit: fruitTotal(log),
    vegetable: vegetableTotal(log),
    caffeine: caffeineTotal(log),
  }))

  const modalityChartData = (modalities ?? []).map((m) => ({
    modality: m.label,
    days: daysByModality?.get(m.id)?.size ?? 0,
  }))

  const progressChartData = (workSetPoints ?? []).map((p) => ({ ...p, label: format(new Date(p.date), 'M/d') }))

  const rangeLabel = `${format(subDays(new Date(), DAYS - 1), 'MMM d')} – ${format(new Date(), 'MMM d, yyyy')}`

  return (
    <div className="mx-auto max-w-6xl px-6 py-8 print:max-w-none">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-slate-100">Training Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">Last {DAYS} days · {rangeLabel}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card title="Sleep" subtitle="Subjective quality (×10) vs. wearable score">
          {sleepChartData.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer>
                <BarChart data={sleepChartData}>
                  <XAxis dataKey="label" stroke={AXIS} fontSize={12} />
                  <YAxis stroke={AXIS} fontSize={12} domain={[0, 100]} />
                  <Tooltip contentStyle={GRID_TOOLTIP} />
                  <Legend wrapperStyle={LEGEND_STYLE} />
                  <Bar dataKey="subjective" name="Subjective (×10)" fill="#38bdf8" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="objective" name="Wearable score" fill="#a78bfa" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card title="Weight" subtitle="Morning vs. evening weigh-ins (lbs)">
          {weightChartData.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer>
                <BarChart data={weightChartData}>
                  <XAxis dataKey="label" stroke={AXIS} fontSize={12} />
                  <YAxis stroke={AXIS} fontSize={12} domain={[Math.floor(weightMin - 2), Math.ceil(weightMax + 2)]} />
                  <Tooltip contentStyle={GRID_TOOLTIP} />
                  <Legend wrapperStyle={LEGEND_STYLE} />
                  <Bar dataKey="morning" name="Morning" fill="#38bdf8" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="evening" name="Evening" fill="#a78bfa" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card title="Nutrition — hydration" subtitle="Water & milk (oz)">
          {nutritionChartData.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer>
                <BarChart data={nutritionChartData}>
                  <XAxis dataKey="label" stroke={AXIS} fontSize={12} />
                  <YAxis stroke={AXIS} fontSize={12} />
                  <Tooltip contentStyle={GRID_TOOLTIP} />
                  <Legend wrapperStyle={LEGEND_STYLE} />
                  <Bar dataKey="water" name="Water (oz)" fill="#38bdf8" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="milk" name="Milk (oz)" fill="#e2e8f0" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card title="Nutrition — fruit & vegetables" subtitle="Servings per day">
          {nutritionChartData.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer>
                <BarChart data={nutritionChartData}>
                  <XAxis dataKey="label" stroke={AXIS} fontSize={12} />
                  <YAxis stroke={AXIS} fontSize={12} allowDecimals={false} />
                  <Tooltip contentStyle={GRID_TOOLTIP} />
                  <Legend wrapperStyle={LEGEND_STYLE} />
                  <Bar dataKey="fruit" name="Fruit" fill="#ef4444" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="vegetable" name="Vegetables" fill="#22c55e" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card title="Modalities">
          <div className="mb-3 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setWeekAnchor((d) => subWeeks(d, 1))}
              className="rounded-md bg-slate-800 px-2.5 py-1 text-xs text-slate-200"
            >
              ← Prev
            </button>
            <span className="text-xs text-slate-400">
              {format(weekStartDate, 'MMM d')} – {format(weekEndDate, 'MMM d, yyyy')}
            </span>
            <button
              type="button"
              onClick={() => setWeekAnchor((d) => addWeeks(d, 1))}
              className="rounded-md bg-slate-800 px-2.5 py-1 text-xs text-slate-200"
            >
              Next →
            </button>
          </div>
          {modalityChartData.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer>
                <BarChart data={modalityChartData} margin={{ bottom: 30 }}>
                  <XAxis dataKey="modality" stroke={AXIS} fontSize={11} angle={-30} textAnchor="end" interval={0} />
                  <YAxis stroke={AXIS} fontSize={12} domain={[0, 7]} allowDecimals={false} />
                  <ReferenceLine
                    y={GOAL_DAYS}
                    stroke="#38bdf8"
                    strokeDasharray="4 4"
                    label={{ value: `Goal: ${GOAL_DAYS}+`, fill: '#38bdf8', fontSize: 11, position: 'insideTopRight' }}
                  />
                  <Bar dataKey="days">
                    {modalityChartData.map((d, i) => (
                      <Cell key={i} fill={d.days >= GOAL_DAYS ? '#22c55e' : '#64748b'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card title="Progress">
          <select
            value={activityId ?? ''}
            onChange={(e) => setActivityId(e.target.value || null)}
            className="mb-3 w-full rounded-md bg-slate-800 px-3 py-2 text-sm"
          >
            <option value="">Select an exercise…</option>
            {(activities ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>

          {!activityId && <EmptyState label="Pick an exercise to see its work-set history." />}
          {activityId && progressChartData.length === 0 && <EmptyState label="No work sets recorded yet." />}

          {progressChartData.length > 0 && (
            <div className="h-56 w-full">
              <ResponsiveContainer>
                <BarChart data={progressChartData}>
                  <XAxis dataKey="label" stroke={AXIS} fontSize={12} />
                  <YAxis stroke={AXIS} fontSize={12} />
                  <Tooltip
                    contentStyle={GRID_TOOLTIP}
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
                    {progressChartData.map((p, i) => (
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
          )}
        </Card>
      </div>
    </div>
  )
}

function EmptyState({ label = 'No data yet.' }: { label?: string }) {
  return <p className="py-10 text-center text-sm text-slate-500">{label}</p>
}
