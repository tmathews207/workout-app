import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { supabase } from '../../lib/supabase'
import { MoveSessionDate } from '../../components/MoveSessionDate'
import { SetDetailsFields, detailsToPayload, payloadToDisplay, type Details } from '../../components/activityFields'
import type { Activity, ActivityType, Phase, PlannedSet, SessionActivity, SessionPhase, SessionType } from '../../types/database'

const PHASES: Phase[] = ['preparatory', 'training', 'recovery']
const PHASE_LABEL: Record<Phase, string> = { preparatory: 'Preparatory', training: 'Training', recovery: 'Recovery' }
const EXERCISE_TYPES: ActivityType[] = ['strength', 'power', 'anaerobic', 'aerobic']

type SessionActivityFull = SessionActivity & { activities: Activity; planned_sets: PlannedSet[] }
type SessionPhaseFull = SessionPhase & { session_activities: SessionActivityFull[] }
type SessionFull = { id: string; session_date: string; session_type: SessionType; session_phases: SessionPhaseFull[] }

function useSessionForDate(date: string) {
  return useQuery({
    queryKey: ['plan_session', date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select(
          `id, session_date, session_type,
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
      const { data, error } = await supabase.from('activities').select('*').order('sort_order').order('name')
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
  )
}

// The batch flow: pick an activity + how many warm-up/work sets, generate
// that many blank set forms at once, fill them all in, save together —
// instead of the mobile flow's one-set-at-a-time "+ Repeat set".
function BatchAddActivity({
  options,
  onCancel,
  onSave,
  saving,
}: {
  options: Activity[]
  onCancel: () => void
  onSave: (activity: Activity, sets: Details[]) => void
  saving: boolean
}) {
  const [selectedActivityId, setSelectedActivityId] = useState('')
  const [warmupCount, setWarmupCount] = useState(0)
  const [workCount, setWorkCount] = useState(1)
  const [stagedSets, setStagedSets] = useState<Details[] | null>(null)

  const selectedActivity = options.find((a) => a.id === selectedActivityId)

  const generate = () => {
    const total = warmupCount + workCount
    if (!selectedActivity || total <= 0) return
    setStagedSets(
      Array.from({ length: total }, (_, i) => ({ set_kind: i < warmupCount ? 'warm-up' : 'work' }) as Details),
    )
  }

  const updateStagedSet = (index: number, key: string, value: string | boolean) => {
    setStagedSets((sets) => sets?.map((s, i) => (i === index ? { ...s, [key]: value } : s)) ?? null)
  }

  const copyFirstToAll = () => {
    setStagedSets((sets) => {
      if (!sets || sets.length < 2) return sets
      const first = sets[0]
      return sets.map((s, i) => (i === 0 ? s : { ...first, set_kind: s.set_kind }))
    })
  }

  if (!stagedSets) {
    return (
      <div className="mt-3 space-y-3 rounded-md border border-slate-800 bg-slate-900/50 p-4">
        <select
          value={selectedActivityId}
          onChange={(e) => setSelectedActivityId(e.target.value)}
          className="w-full rounded-md bg-slate-800 px-3 py-2"
        >
          <option value="">Select an activity…</option>
          {options.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.type})
            </option>
          ))}
        </select>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-200">Warm-up sets</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={warmupCount}
              onChange={(e) => setWarmupCount(Math.max(0, Number(e.target.value) || 0))}
              className="w-full rounded-md bg-slate-800 px-3 py-2"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-200">Work sets</span>
            <input
              type="number"
              inputMode="numeric"
              min={0}
              value={workCount}
              onChange={(e) => setWorkCount(Math.max(0, Number(e.target.value) || 0))}
              className="w-full rounded-md bg-slate-800 px-3 py-2"
            />
          </label>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={!selectedActivityId || warmupCount + workCount === 0}
            onClick={generate}
            className="rounded-md bg-sky-500 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            Generate sets
          </button>
          <button type="button" onClick={onCancel} className="rounded-md bg-slate-800 px-3 py-2 text-sm text-slate-200">
            Cancel
          </button>
        </div>
      </div>
    )
  }

  const hasMachineSetting = Boolean((selectedActivity?.details as Record<string, unknown> | undefined)?.has_machine_setting)

  return (
    <div className="mt-3 space-y-4 rounded-md border border-slate-800 bg-slate-900/50 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-200">
          {selectedActivity?.name} — {warmupCount} warm-up, {workCount} work
        </h3>
        <button type="button" onClick={() => setStagedSets(null)} className="text-xs text-slate-400 hover:underline">
          Start over
        </button>
      </div>

      {stagedSets.length > 1 && (
        <button type="button" onClick={copyFirstToAll} className="text-xs text-sky-400 hover:underline">
          Copy set 1's values to all sets
        </button>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {stagedSets.map((details, i) => (
          <div key={i} className="rounded-md border border-slate-800 bg-slate-950 p-3">
            <div className="mb-2 text-sm font-medium text-slate-300">
              Set {i + 1} <span className="text-xs text-slate-500">({i < warmupCount ? 'warm-up' : 'work'})</span>
            </div>
            <SetDetailsFields
              type={selectedActivity!.type}
              details={details}
              hasMachineSetting={hasMachineSetting}
              setDetail={(k, v) => updateStagedSet(i, k, v)}
            />
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          disabled={saving}
          onClick={() => selectedActivity && onSave(selectedActivity, stagedSets)}
          className="rounded-md bg-sky-500 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          {saving ? 'Saving…' : `Save all ${stagedSets.length} sets`}
        </button>
        <button type="button" onClick={onCancel} className="rounded-md bg-slate-800 px-3 py-2 text-sm text-slate-200">
          Cancel
        </button>
      </div>
    </div>
  )
}

export default function PlanSessionDesktop() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [addingActivityFor, setAddingActivityFor] = useState<Phase | null>(null)
  const queryClient = useQueryClient()

  const { data: session, isLoading } = useSessionForDate(date)
  const { data: allActivities } = useActivityOptions()

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['plan_session', date] })

  const createSessionMutation = useMutation({
    mutationFn: async (sessionType: SessionType) => {
      const { data: newSession, error } = await supabase
        .from('sessions')
        .insert({ session_date: date, session_type: sessionType })
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

  const setSessionTypeMutation = useMutation({
    mutationFn: async (sessionType: SessionType) => {
      if (!session) return
      const { error } = await supabase.from('sessions').update({ session_type: sessionType }).eq('id', session.id)
      if (error) throw error
    },
    onSuccess: invalidate,
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
      const { error } = await supabase.from('planned_sets').insert({ session_activity_id: sessionActivityId, set_number: setNumber, details })
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

  const batchAddMutation = useMutation({
    mutationFn: async ({
      phaseId,
      sortOrder,
      activity,
      sets,
    }: {
      phaseId: string
      sortOrder: number
      activity: Activity
      sets: Details[]
    }) => {
      const { data: newSessionActivity, error } = await supabase
        .from('session_activities')
        .insert({ phase_id: phaseId, activity_id: activity.id, sort_order: sortOrder })
        .select('id')
        .single()
      if (error) throw error

      const rows = sets.map((details, i) => ({
        session_activity_id: newSessionActivity.id,
        set_number: i + 1,
        details: detailsToPayload(details),
      }))
      const { error: setsError } = await supabase.from('planned_sets').insert(rows)
      if (setsError) throw setsError
    },
    onSuccess: () => {
      invalidate()
      setAddingActivityFor(null)
    },
  })

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-100">Plan a session (desktop)</h1>
        <p className="mt-1 text-sm text-slate-400">
          Pick an exercise, set how many warm-up and work sets you intend, and fill them all in at once.
        </p>
      </div>

      <label className="mb-6 block max-w-xs">
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
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => createSessionMutation.mutate('standard')}
            disabled={createSessionMutation.isPending}
            className="rounded-md bg-sky-500 px-4 py-2 font-medium text-white disabled:opacity-40"
          >
            {createSessionMutation.isPending ? 'Creating…' : `Start planning ${date}`}
          </button>
          <button
            type="button"
            onClick={() => createSessionMutation.mutate('army_prt')}
            disabled={createSessionMutation.isPending}
            className="rounded-md bg-slate-800 px-4 py-2 font-medium text-slate-200 disabled:opacity-40"
          >
            Mark {date} as Army PRT
          </button>
        </div>
      )}

      {session && (
        <div className="space-y-8">
          <MoveSessionDate
            sessionId={session.id}
            currentDate={date}
            defaultTarget={format(new Date(), 'yyyy-MM-dd')}
            queryKeyPrefixes={['plan_session', 'track_session']}
            onMoved={setDate}
          />

          {session.session_type === 'army_prt' ? (
            <div className="rounded-lg border border-slate-800 p-4">
              <h2 className="mb-1 text-lg font-medium text-slate-100">Army PRT</h2>
              <p className="text-sm text-slate-400">
                No exercise planning needed — when you track this session you'll check off which modalities were used
                and log an aerobic time.
              </p>
              <button
                type="button"
                onClick={() => setSessionTypeMutation.mutate('standard')}
                disabled={setSessionTypeMutation.isPending}
                className="mt-3 text-xs text-sky-400 hover:underline disabled:opacity-40"
              >
                Convert to standard planning instead
              </button>
            </div>
          ) : (
            PHASES.map((phase) => {
            const phaseRow = session.session_phases.find((p) => p.phase === phase)
            const phaseId = phaseRow?.id
            const activities = phaseRow?.session_activities ?? []
            const options = phase === 'training' ? (allActivities ?? []).filter((a) => EXERCISE_TYPES.includes(a.type)) : (allActivities ?? [])

            return (
              <div key={phase}>
                <h2 className="mb-3 text-lg font-medium text-slate-100">{PHASE_LABEL[phase]}</h2>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
                            details: (sa.planned_sets[sa.planned_sets.length - 1]?.details ?? {}) as Record<string, unknown>,
                          })
                        }
                        disabled={addSetMutation.isPending}
                        className="mt-2 rounded-md bg-slate-800 px-3 py-1.5 text-sm text-slate-200 disabled:opacity-40"
                      >
                        {sa.planned_sets.length === 0 ? '+ Add set' : `+ Repeat set ${sa.planned_sets.length} (same weight, reps, RPE…)`}
                      </button>
                    </div>
                  ))}
                </div>

                {addingActivityFor === phase ? (
                  <BatchAddActivity
                    options={options}
                    saving={batchAddMutation.isPending}
                    onCancel={() => setAddingActivityFor(null)}
                    onSave={(activity, sets) =>
                      phaseId && batchAddMutation.mutate({ phaseId, sortOrder: activities.length, activity, sets })
                    }
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddingActivityFor(phase)}
                    className="mt-3 rounded-md bg-slate-800 px-3 py-1.5 text-sm text-slate-200"
                  >
                    + Add exercise
                  </button>
                )}
              </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
