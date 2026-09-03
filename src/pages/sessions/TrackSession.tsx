import { PageShell } from '../../components/PageShell'

// TODO: load today's planned `sessions` row + phases/activities/planned_sets,
// start with perceived_recovery + environment/temperature_f/humidity_pct/
// start_time, then step through each planned set recording an `actual_sets`
// row, and finish with session_fatigue/pain_intensity/session_focus. Used
// from the iPhone.
export default function TrackSession() {
  return (
    <PageShell title="Track today's session" description="Log actual sets against today's plan.">
      <p className="text-sm text-slate-400">Not yet implemented — see TODO in this file.</p>
    </PageShell>
  )
}
