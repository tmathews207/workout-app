import { useQuery } from '@tanstack/react-query'
import { format, subDays } from 'date-fns'
import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '../../lib/supabase'
import { PageShell } from '../../components/PageShell'

const DAYS = 14

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

export default function WeightTrends() {
  const { data, isLoading } = useWeightTrend()

  const byDate = new Map<string, { label: string; morning?: number; evening?: number }>()
  for (const row of data ?? []) {
    const entry = byDate.get(row.log_date) ?? { label: format(new Date(row.log_date), 'M/d') }
    entry[row.period] = row.weight_lbs
    byDate.set(row.log_date, entry)
  }
  const chartData = [...byDate.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([, v]) => v)

  const weights = chartData.flatMap((d) => [d.morning, d.evening]).filter((w): w is number => w != null)
  const min = weights.length ? Math.min(...weights) : 0
  const max = weights.length ? Math.max(...weights) : 0

  return (
    <PageShell title="Weight Trends" description={`Morning vs. evening weigh-ins, last ${DAYS} days.`}>
      {isLoading && <p className="text-sm text-slate-400">Loading…</p>}
      {!isLoading && chartData.length === 0 && <p className="text-sm text-slate-400">No weight entries yet.</p>}
      {chartData.length > 0 && (
        <div className="h-80 w-full">
          <ResponsiveContainer>
            <BarChart data={chartData}>
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
              {/* Zoomed to the actual range rather than starting at 0 — body
                  weight varies by a few pounds day to day, and a 0-based axis
                  would flatten every bar to nearly the same height. */}
              <YAxis
                stroke="#94a3b8"
                fontSize={12}
                domain={[Math.floor(min - 2), Math.ceil(max + 2)]}
                label={{ value: 'lbs', angle: -90, position: 'insideLeft', fill: '#94a3b8' }}
              />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', color: '#e2e8f0' }} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
              <Bar dataKey="morning" name="Morning" fill="#38bdf8" radius={[2, 2, 0, 0]} />
              <Bar dataKey="evening" name="Evening" fill="#a78bfa" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </PageShell>
  )
}
