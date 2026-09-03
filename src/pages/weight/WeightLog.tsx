import { PageShell } from '../../components/PageShell'

// TODO: form for a morning or evening weigh-in (radio: period), writing to
// `weight_logs` (unique per log_date + period). Follow the pattern in
// src/pages/sleep/SleepSubjective.tsx (react-hook-form + zod + supabase upsert).
export default function WeightLog() {
  return (
    <PageShell title="Weight" description="Morning and evening weigh-ins, up to two per day.">
      <p className="text-sm text-slate-400">Not yet implemented — see TODO in this file.</p>
    </PageShell>
  )
}
