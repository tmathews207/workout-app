import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '../../lib/supabase'
import { PageShell } from '../../components/PageShell'
import { DateWindowNav } from '../../components/DateWindowNav'
import { useDateWindow } from '../../lib/useDateWindow'
import { readinessAverage } from '../../lib/readinessTotals'

function useReadinessTrend(startStr: string, endStr: string) {
  return useQuery({
    queryKey: ['readiness_trend', startStr, endStr],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('readiness_logs')
        .select('log_date, energy_level, mental_focus, stress_level, work_life_balance')
        .gte('log_date', startStr)
        .lte('log_date', endStr)
        .order('log_date')
      if (error) throw error
      return (data ?? []) as {
        log_date: string
        energy_level: number | null
        mental_focus: number | null
        stress_level: number | null
        work_life_balance: number | null
      }[]
    },
  })
}

export default function ReadinessTrends() {
  const window = useDateWindow()
  const { data, isLoading } = useReadinessTrend(window.startStr, window.endStr)

  const chartData = (data ?? [])
    .map((row) => ({ label: format(new Date(row.log_date), 'M/d'), average: readinessAverage(row) }))
    .filter((row) => row.average != null)

  return (
    <PageShell title="Mental Readiness Trends" description="Average of energy, focus, stress, and work-life balance ratings (0–10).">
      <DateWindowNav
        startDate={window.startDate}
        endDate={window.endDate}
        isCurrent={window.isCurrent}
        onPrev={window.prev}
        onNext={window.next}
      />
      {isLoading && <p className="text-sm text-slate-400">Loading…</p>}
      {!isLoading && chartData.length === 0 && <p className="text-sm text-slate-400">No readiness entries yet.</p>}
      {chartData.length > 0 && (
        <div className="h-80 w-full">
          <ResponsiveContainer>
            <BarChart data={chartData}>
              <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
              <YAxis stroke="#94a3b8" fontSize={12} domain={[0, 10]} />
              <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', color: '#e2e8f0' }} />
              <Bar dataKey="average" name="Average readiness" fill="#38bdf8" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </PageShell>
  )
}
