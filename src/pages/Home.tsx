import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { PageShell } from '../components/PageShell'

const today = format(new Date(), 'yyyy-MM-dd')

// Demonstrates the Supabase + TanStack Query wiring: today's sleep log, if any.
function useTodaySleepLog() {
  return useQuery({
    queryKey: ['sleep_logs', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sleep_logs')
        .select('*')
        .eq('log_date', today)
        .maybeSingle()
      if (error) throw error
      return data
    },
  })
}

export default function Home() {
  const { data: sleepLog, isLoading, error } = useTodaySleepLog()

  return (
    <PageShell title="Today" description={format(new Date(), 'EEEE, MMMM d, yyyy')}>
      <div className="grid gap-3">
        <Link to="/sleep" className="rounded-lg border border-slate-800 p-4 hover:border-slate-600">
          <div className="font-medium">Sleep</div>
          <div className="text-sm text-slate-400">
            {isLoading && 'Loading…'}
            {error && 'Could not load — check your Supabase env vars'}
            {!isLoading && !error && (sleepLog ? 'Recorded' : 'Not recorded yet')}
          </div>
        </Link>
        <Link to="/weight" className="rounded-lg border border-slate-800 p-4 hover:border-slate-600">
          <div className="font-medium">Weight</div>
          <div className="text-sm text-slate-400">Morning / evening weigh-ins</div>
        </Link>
        <Link to="/readiness" className="rounded-lg border border-slate-800 p-4 hover:border-slate-600">
          <div className="font-medium">Mental readiness</div>
          <div className="text-sm text-slate-400">End-of-day ratings, notes, reading &amp; listening</div>
        </Link>
        <Link to="/sessions/track" className="rounded-lg border border-slate-800 p-4 hover:border-slate-600">
          <div className="font-medium">Track today's session</div>
          <div className="text-sm text-slate-400">Log actual sets against the plan</div>
        </Link>
      </div>
    </PageShell>
  )
}
