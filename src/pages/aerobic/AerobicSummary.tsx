import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { addWeeks, endOfWeek, format, startOfWeek, subWeeks } from 'date-fns'
import { supabase } from '../../lib/supabase'
import { PageShell } from '../../components/PageShell'

type DistanceGroup = 'running' | 'rowing'

interface AerobicSummaryData {
  totalDurationSec: number
  distanceByGroup: Record<DistanceGroup, Record<string, number>>
}

function useWeeklyAerobicSummary(weekStart: string, weekEnd: string) {
  return useQuery({
    queryKey: ['aerobic_summary', weekStart, weekEnd],
    queryFn: async (): Promise<AerobicSummaryData> => {
      const { data: rawData, error } = await supabase
        .from('sessions')
        .select(
          `session_date,
           session_phases(session_activities(activities(name, type), actual_sets(details)))`,
        )
        .gte('session_date', weekStart)
        .lte('session_date', weekEnd)
      if (error) throw error

      // The untyped client can't know activities is to-one from this side,
      // so it infers an array — it's a single object at runtime.
      const data = rawData as unknown as {
        session_date: string
        session_phases: {
          session_activities: {
            activities: { name: string; type: string }
            actual_sets: { details: Record<string, unknown> }[]
          }[]
        }[]
      }[]

      let totalDurationSec = 0
      const distanceByGroup: Record<DistanceGroup, Record<string, number>> = { running: {}, rowing: {} }

      for (const session of data ?? []) {
        for (const phase of session.session_phases ?? []) {
          for (const sa of phase.session_activities ?? []) {
            if (sa.activities?.type !== 'aerobic') continue
            const name = (sa.activities.name ?? '').toLowerCase()
            const group: DistanceGroup | null = name.includes('run') ? 'running' : name.includes('row') ? 'rowing' : null

            for (const actual of sa.actual_sets ?? []) {
              const details = actual.details ?? {}
              if (details.skipped) continue

              totalDurationSec += Number(details.duration_sec) || 0

              if (group) {
                const value = Number(details.distance_value) || 0
                if (value > 0) {
                  const unit = (details.distance_unit as string) || 'miles'
                  distanceByGroup[group][unit] = (distanceByGroup[group][unit] ?? 0) + value
                }
              }
            }
          }
        }
      }

      return { totalDurationSec, distanceByGroup }
    },
  })
}

function formatDuration(totalSeconds: number): string {
  const totalMinutes = Math.round(totalSeconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return hours === 0 ? `${minutes} min` : `${hours}h ${minutes}m`
}

function trimNumber(n: number): string {
  return String(Number(n.toFixed(2)))
}

function formatDistance(byUnit: Record<string, number>): string {
  const parts: string[] = []
  if (byUnit.miles) parts.push(`${trimNumber(byUnit.miles)} mi`)
  if (byUnit.meters) parts.push(`${trimNumber(byUnit.meters)} m`)
  return parts.length > 0 ? parts.join(', ') : '—'
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-800 p-4">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-100">{value}</div>
    </div>
  )
}

export default function AerobicSummary() {
  const [weekAnchor, setWeekAnchor] = useState(new Date())
  const weekStartDate = startOfWeek(weekAnchor, { weekStartsOn: 0 })
  const weekEndDate = endOfWeek(weekAnchor, { weekStartsOn: 0 })
  const weekStart = format(weekStartDate, 'yyyy-MM-dd')
  const weekEnd = format(weekEndDate, 'yyyy-MM-dd')

  const { data, isLoading } = useWeeklyAerobicSummary(weekStart, weekEnd)

  return (
    <PageShell title="Aerobic Totals" description="Total time across all aerobic activity, and distance for running and rowing.">
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard label="Total aerobic time" value={formatDuration(data?.totalDurationSec ?? 0)} />
          <StatCard label="Running distance" value={formatDistance(data?.distanceByGroup.running ?? {})} />
          <StatCard label="Rowing distance" value={formatDistance(data?.distanceByGroup.rowing ?? {})} />
        </div>
      )}

      <p className="mt-4 text-xs text-slate-500">
        Time is summed across every aerobic activity; distance is broken out only for activities named "run" or "row".
      </p>
    </PageShell>
  )
}
