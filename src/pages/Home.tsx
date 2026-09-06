import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PageShell } from '../components/PageShell'
import { formatHHMM } from '../lib/format'
import type { NutritionLog } from '../types/database'

const today = format(new Date(), 'yyyy-MM-dd')

function formatTime12(t: string | null | undefined) {
  if (!t) return null
  const [hStr, mStr] = t.split(':')
  const h = Number(hStr)
  const m = Number(mStr)
  if (Number.isNaN(h) || Number.isNaN(m)) return t
  const period = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${period}`
}

function useTodaySleepLog() {
  return useQuery({
    queryKey: ['sleep_logs', today],
    queryFn: async () => {
      const { data, error } = await supabase.from('sleep_logs').select('*').eq('log_date', today).maybeSingle()
      if (error) throw error
      return data
    },
  })
}

function useTodayWeightLogs() {
  return useQuery({
    queryKey: ['weight_logs', today],
    queryFn: async () => {
      const { data, error } = await supabase.from('weight_logs').select('*').eq('log_date', today)
      if (error) throw error
      return data ?? []
    },
  })
}

function useTodayNutritionLog() {
  return useQuery({
    queryKey: ['nutrition_logs', today],
    queryFn: async () => {
      const { data, error } = await supabase.from('nutrition_logs').select('*').eq('log_date', today).maybeSingle()
      if (error) throw error
      return data as NutritionLog | null
    },
  })
}

export default function Home() {
  const { data: sleepLog, isLoading: sleepLoading, error: sleepError } = useTodaySleepLog()
  const { data: weightLogs, isLoading: weightLoading } = useTodayWeightLogs()
  const { data: nutritionLog, isLoading: nutritionLoading } = useTodayNutritionLog()

  const sleepSummary = (() => {
    if (sleepLoading) return 'Loading…'
    if (sleepError) return 'Could not load — check your Supabase env vars'
    if (!sleepLog) return 'Not recorded yet'
    if (sleepLog.total_hours_slept == null) return 'Subjective done — objective data pending'
    const bed = formatTime12(sleepLog.bedtime)
    const wake = formatTime12(sleepLog.wake_time)
    return `Bed ${bed ?? '—'} · Up ${wake ?? '—'} · ${formatHHMM(sleepLog.total_hours_slept)} sleep`
  })()

  const weightSummary = (() => {
    if (weightLoading) return 'Loading…'
    const morning = weightLogs?.find((w) => w.period === 'morning')
    const evening = weightLogs?.find((w) => w.period === 'evening')
    if (!morning && !evening) return 'Not recorded yet'
    return `Morning: ${morning ? `${morning.weight_lbs} lbs` : '—'} · Evening: ${evening ? `${evening.weight_lbs} lbs` : '—'}`
  })()

  const nutritionSummary = (() => {
    if (nutritionLoading) return 'Loading…'
    const log = nutritionLog
    const waterTotal = log
      ? (log.water_1_taken ? log.water_oz_1 : 0) +
        (log.water_2_taken ? log.water_oz_2 : 0) +
        (log.water_3_taken ? log.water_oz_3 : 0) +
        log.additional_water_oz
      : 0
    return `Water: ${waterTotal} / 60 oz`
  })()

  return (
    <PageShell title="Today" description={format(new Date(), 'EEEE, MMMM d, yyyy')}>
      <div className="grid gap-3">
        <Link to="/sleep" className="rounded-lg border border-slate-800 p-4 hover:border-slate-600">
          <div className="font-medium">Sleep</div>
          <div className="text-sm text-slate-400">{sleepSummary}</div>
        </Link>
        <Link to="/weight" className="rounded-lg border border-slate-800 p-4 hover:border-slate-600">
          <div className="font-medium">Weight</div>
          <div className="text-sm text-slate-400">{weightSummary}</div>
        </Link>
        <Link to="/readiness" className="rounded-lg border border-slate-800 p-4 hover:border-slate-600">
          <div className="font-medium">Mental readiness</div>
          <div className="text-sm text-slate-400">End-of-day ratings, notes, reading &amp; listening</div>
        </Link>
        <Link to="/nutrition" className="rounded-lg border border-slate-800 p-4 hover:border-slate-600">
          <div className="font-medium">Nutrition</div>
          <div className="text-sm text-slate-400">{nutritionSummary}</div>
        </Link>
        <Link to="/sessions/track" className="rounded-lg border border-slate-800 p-4 hover:border-slate-600">
          <div className="font-medium">Track today's session</div>
          <div className="text-sm text-slate-400">Log actual sets against the plan</div>
        </Link>
      </div>
    </PageShell>
  )
}
