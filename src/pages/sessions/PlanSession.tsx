import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { supabase } from '../../lib/supabase'
import { PageShell } from '../../components/PageShell'
import { SetDetailsFields, detailsToPayload, payloadToDisplay, type Details } from '../../components/activityFields'
import type { Activity, ActivityType, Phase, PlannedSet, SessionActivity, SessionPhase } from '../../types/database'

const PHASES: Phase[] = ['preparatory', 'training', 'recovery']
const PHASE_LABEL: Record<Phase, string> = { preparatory: 'Preparatory', training: 'Training', recovery: 'Recovery' }
// Training is exercises only; prep/recovery may also include mobility/stretching.
const EXERCISE_TYPES: ActivityType[] = ['strength', 'power', 'anaerobic', 'aerobic']

type SessionActivityFull = SessionActivity & { activities: Activity; planned_sets: PlannedSet[] }
type SessionPhaseFull = SessionPhase & { session_activities: SessionActivityFull[] }
type SessionFull = { id: string; session_date: string; session_phases: SessionPhaseFull[] }

function useSessionForDate(date: string) {
  return useQuery({
    queryKey: ['plan_session', date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select(
          `id, session_date,
           session_phases(*, session_activities(*, activities(*), planned_sets(*)))`,
        )
        .eq('session_date', date)
        .order('sort_order', { referencedTable: 'session_phases' })
        .order('sort_order', { referencedTable: 'session_phases.session_activities' })
        .order('set_number', { referencedTable: 'session_phases.session_activities.planned_sets' })
        .maybeSingle()
      if (error) throw error
      return data as unknown as SessionFull | null
    },
  })
}

function useActivityOptions() {
  return useQuery({
    queryKey: ['activities'],
    queryFn: async () => {
      const { data, error } = await supabase.from('activities').select('*').order('type').order('name')
      if (error) throw error
      return data as Activity[]
    },
  })
}

function SetEditor({
  set,
  activityType,
  hasMachineSetting,
  onSave,
  onDelete,
}: {
  set: PlannedSet
  activityType: ActivityType
  hasMachineSetting?: boolean
  onSave: (details: Details) => void
  onDelete: () => void
}) {
  const [details, setDetails] = useState<Details>(() => payloadToDisplay(set.details as Record<string, unknown>))
  const [dirty, setDirty] = useState(false)

  return (
    <div className="rounded-md border border-slate-800 bg-slate-900/50 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-300">Set {set.set_number}</span>
        <div className="flex gap-2">
          {dirty && (
            <button
              type="button"
              onClick={() => {
                onSave(details)
                setDirty(false)
              }}
              className="rounded bg-sky-500 px-2 py-1 text-xs font-medium text-white"
            >
              Save
            </button>
          )}
          <button type="button" onClick={onDelete} className="rounded bg-slate-800 px-2 py-1 text-xs text-red-400">
            Delete
          </button>
        </div>
      </div>
      <div className="space-y-2">
        <SetDetailsFields
          type={activityType}
          details={details}
          hasMachineSetting={hasMachineSetting}
          setDetail={(k, v) => {
            setDetails((d) => ({ ...d, [k]: v }))
            setDirty(true)
          }}
        />
      </div>
    </div>
  )
}

export default function PlanSession() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [addingActivityFor, setAddingActivityFor] = useState<Phase | null>(null)
  const [selectedActivityId, setSelectedActivityId] = useState('')
  const queryClient = useQueryClient()

  const { data: session, isLoading } = useSessionForDate(date)
  const { data: allActivities } = useActivityOptions()

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['plan_session', date] })

  const createSessionMutation = useMutation({
    mutationFn: async () => {
      const { data: newSession, error } = await supabase
        .from('sessions')
        .insert({ session_date: date })
        .select('id')
        .single()
      if (error) throw error
      const { error: phaseError } = await supabase
        .from('session_phases')
        .insert(PHASES.map((phase, i) => ({ session_id: newSession.id, phase, sort_order: i })))
      if (phaseError) throw phaseError
    },
    onSuccess: invalidate,
  })

  const addActivityMutation = useMutation({
    mutationFn: async ({ phaseId, activityId, sortOrder }: { phaseId: string; activityId: string; sortOrder: number }) => {
      const { error } = await supabase
        .from('session_activities')
        .insert({ phase_id: phaseId, activity_id: activityId, sort_order: sortOrder })
      if (error) throw error
    },
    onSuccess: () => {
      invalidate()
      setAddingActivityFor(null)
      setSelectedActivityId('')
    },
  })

  const removeActivityMutation = useMutation({
    mutationFn: async (sessionActivityId: string) => {
      const { error } = await supabase.from('session_activities').delete().eq('id', sessionActivityId)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const addSetMutation = useMutation({
    mutationFn: async ({
      sessionActivityId,
      setNumber,
      details,
    }: {
      sessionActivityId: string
      setNumber: number
      details: Record<string, unknown>
    }) => {
      const { error } = await supabase
        .from('planned_sets')
        .insert({ session_activity_id: sessionActivityId, set_number: setNumber, details })
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const updateSetMutation = useMutation({
    mutationFn: async ({ id, details }: { id: string; details: Details }) => {
      const { error } = await supabase.from('planned_sets').update({ details: detailsToPayload(details) }).eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const deleteSetMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('planned_sets').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  return (
    <PageShell title="Plan a session" description="Preparatory, training, and recovery phases for a given date.">
      <label className="mb-6 block">
        <span className="mb-1 block text-sm font-medium text-slate-200">Date</span>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-full rounded-md bg-slate-800 px-3 py-2"
        />
      </label>

      {isLoading && <p className="text-sm text-slate-400">Loading…</p>}

      {!isLoading && !session && (
        <button
          type="button"
          onClick={() => createSessionMutation.mutate()}
          disabled={createSessionMutation.isPending}
          className="rounded-md bg-sky-500 px-4 py-2 font-medium text-white disabled:opacity-40"
        >
          {createSessionMutation.isPending ? 'Creating…' : `Start planning ${date}`}
        </button>
      )}

      {session && (
        <div className="space-y-8">
          {PHASES.map((phase) => {
            const phaseRow = session.session_phases.find((p) => p.phase === phase)
            const phaseId = phaseRow?.id
            const activities = phaseRow?.session_activities ?? []
            const options =
              phase === 'training'
                ? (allActivities ?? []).filter((a) => EXERCISE_TYPES.includes(a.type))
                : (allActivities ?? [])

            return (
              <div key={phase}>
                <h2 className="mb-3 text-lg font-medium text-slate-100">{PHASE_LABEL[phase]}</h2>

                <div className="space-y-4">
                  {activities.map((sa) => (
                    <div key={sa.id} className="rounded-lg border border-slate-800 p-3">
                      <div className="mb-3 flex items-center justify-between">
                        <div>
                          <div className="font-medium">{sa.activities.name}</div>
                          <div className="text-xs uppercase tracking-wide text-slate-500">{sa.activities.type}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeActivityMutation.mutate(sa.id)}
                          className="rounded bg-slate-800 px-2 py-1 text-xs text-red-400"
                        >
                          Remove activity
                        </button>
                      </div>

                      <div className="space-y-2">
                        {sa.planned_sets.map((set) => (
                          <SetEditor
                            key={set.id}
                            set={set}
                            activityType={sa.activities.type}
                            hasMachineSetting={Boolean((sa.activities.details as Record<string, unknown>)?.has_machine_setting)}
                            onSave={(details) => updateSetMutation.mutate({ id: set.id, details })}
                            onDelete={() => deleteSetMutation.mutate(set.id)}
                          />
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          addSetMutation.mutate({
                            sessionActivityId: sa.id,
                            setNumber: sa.planned_sets.length + 1,
                            // Copy the previous set's targets forward (they're usually the same or
                            // close to it) rather than the activity's defaults — a library entry no
                            // longer carries set-specific targets, so the first set starts blank.
                            details: (sa.planned_sets[sa.planned_sets.length - 1]?.details ?? {}) as Record<string, unknown>,
                          })
                        }
                        className="mt-2 rounded-md bg-slate-800 px-3 py-1.5 text-sm text-slate-200"
                      >
                        + Add set
                      </button>
                    </div>
                  ))}
                </div>

                {addingActivityFor === phase ? (
                  <div className="mt-3 flex gap-2">
                    <select
                      value={selectedActivityId}
                      onChange={(e) => setSelectedActivityId(e.target.value)}
                      className="flex-1 rounded-md bg-slate-800 px-3 py-2"
                    >
                      <option value="">Select an activity…</option>
                      {options.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} ({a.type})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      disabled={!selectedActivityId || !phaseId}
                      onClick={() =>
                        phaseId &&
                        addActivityMutation.mutate({ phaseId, activityId: selectedActivityId, sortOrder: activities.length })
                      }
                      className="rounded-md bg-sky-500 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddingActivityFor(null)}
                      className="rounded-md bg-slate-800 px-3 py-2 text-sm text-slate-200"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddingActivityFor(phase)}
                    className="mt-3 rounded-md bg-slate-800 px-3 py-1.5 text-sm text-slate-200"
                  >
                    + Add activity
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </PageShell>
  )
}
