import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { addWeeks, endOfWeek, format, startOfWeek, subWeeks } from 'date-fns'
import { Bar, BarChart, Cell, ReferenceLine, ResponsiveContainer, XAxis, YAxis } from 'recharts'
import { supabase } from '../../lib/supabase'
import { PageShell } from '../../components/PageShell'
import { useWeekModalityDays } from '../../lib/useWeekModalityDays'
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
