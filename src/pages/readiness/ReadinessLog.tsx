import { PageShell } from '../../components/PageShell'

// TODO: end-of-day form — energy_level, mental_focus, stress_level,
// work_life_balance (RatingScale, max=10), notes, reading/reading_notes,
// listening/listening_notes. Writes to `readiness_logs` (one row per log_date).
export default function ReadinessLog() {
  return (
    <PageShell title="Mental readiness" description="End-of-day ratings, notes, reading & listening.">
      <p className="text-sm text-slate-400">Not yet implemented — see TODO in this file.</p>
    </PageShell>
  )
}
