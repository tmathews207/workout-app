import { useQuery } from '@tanstack/react-query'
import { format, subDays } from 'date-fns'
import { Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { supabase } from '../../lib/supabase'
import { PageShell } from '../../components/PageShell'
import { fruitTotal, milkTotal, vegetableTotal, waterTotal } from '../../lib/nutritionTotals'
import type { NutritionLog } from '../../types/database'

const DAYS = 14

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

export default function NutritionTrends() {
  const { data, isLoading } = useNutritionTrend()

  const chartData = (data ?? []).map((log) => ({
    label: format(new Date(log.log_date), 'M/d'),
    water: waterTotal(log),
    milk: milkTotal(log),
    fruit: fruitTotal(log),
    vegetable: vegetableTotal(log),
  }))

  return (
    <PageShell title="Nutrition Trends" description={`Daily intake, last ${DAYS} days.`}>
      {isLoading && <p className="text-sm text-slate-400">Loading…</p>}
      {!isLoading && chartData.length === 0 && <p className="text-sm text-slate-400">No nutrition entries yet.</p>}

      {chartData.length > 0 && (
        <>
          <h2 className="mb-2 text-sm font-medium text-slate-300">Water &amp; milk (oz)</h2>
          <div className="mb-8 h-64 w-full">
            <ResponsiveContainer>
              <BarChart data={chartData}>
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', color: '#e2e8f0' }} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                <Bar dataKey="water" name="Water (oz)" fill="#38bdf8" radius={[2, 2, 0, 0]} />
                <Bar dataKey="milk" name="Milk (oz)" fill="#e2e8f0" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <h2 className="mb-2 text-sm font-medium text-slate-300">Fruit &amp; vegetables (servings)</h2>
          <div className="h-64 w-full">
            <ResponsiveContainer>
              <BarChart data={chartData}>
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={12} />
                <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #1e293b', color: '#e2e8f0' }} />
                <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
                <Bar dataKey="fruit" name="Fruit" fill="#ef4444" radius={[2, 2, 0, 0]} />
                <Bar dataKey="vegetable" name="Vegetables" fill="#22c55e" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <p className="mt-4 text-xs text-slate-500">
            Split into two charts since water/milk (ounces) and fruit/vegetables (servings) sit on very different
            scales — on one chart the serving bars would be too short to read next to the ounce bars.
          </p>
        </>
      )}
    </PageShell>
  )
}
