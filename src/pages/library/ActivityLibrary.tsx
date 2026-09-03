import { PageShell } from '../../components/PageShell'

// TODO: list/add/edit/delete `activities`, with a type-specific form for
// each of stretch/mobility/strength/power/anaerobic/aerobic (see
// src/types/database.ts for each type's `details` shape) plus a
// multi-select for `activity_modalities`.
export default function ActivityLibrary() {
  return (
    <PageShell title="Activity library" description="Add, edit, and remove activities.">
      <p className="text-sm text-slate-400">Not yet implemented — see TODO in this file.</p>
    </PageShell>
  )
}
