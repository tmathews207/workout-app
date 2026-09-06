import { useQuery } from '@tanstack/react-query'
import { format, subDays } from 'date-fns'
import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '../../lib/supabase'
import { PageShell } from '../../components/PageShell'

const DAYS = 14

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

export default function SleepTrends() {
  const { data, isLoading } = useSleepTrend()

  const chartData = (data ?? []).map((row) => ({
    label: format(new Date(row.log_date), 'M/d'),
    subjective: row.quality != null ? row.quality * 10 : null,
    objective: row.wearable_sleep_score,
  }))

  return (
    <PageShell title="Sleep Trends" description={`Subjective quality (×10) vs. wearable sleep score, last ${DAYS} days.`}>
      {isLoading && <p className="text-sm text-slate-400">Loading…</p>}
      {!isLoading && chartData.length === 0 && <p className="text-sm text-slate-400">No sleep entries yet.</p>}
      {chartData.length > 0 && (
        <div className="h-80 w-full">
          <ResponsiveContainer>
            <BarChart data={chartData}>
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', color: '#e2e8f0' }} />
              <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
              <Bar dataKey="subjective" name="Subjective (×10)" fill="#38bdf8" radius={[2, 2, 0, 0]} />
              <Bar dataKey="objective" name="Wearable score" fill="#a78bfa" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      <p className="mt-4 text-xs text-slate-500">
        Both scaled to 0–100 so the two bars for a given day are directly comparable — the point is whether they track
        together, not the raw numbers.
      </p>
    </PageShell>
  )
}
