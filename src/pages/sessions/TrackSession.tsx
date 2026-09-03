import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { supabase } from '../../lib/supabase'
import { PageShell } from '../../components/PageShell'
import { RatingScale } from '../../components/RatingScale'
import { DetailsFields, detailsToPayload, payloadToDisplay, type Details } from '../../components/activityFields'
import type { ActualSet, Activity, ActivityType, Environment, Phase, PlannedSet, Session, SessionActivity, SessionPhase } from '../../types/database'

const PHASE_LABEL: Record<Phase, string> = { preparatory: 'Preparatory', training: 'Training', recovery: 'Recovery' }

type SessionActivityFull = SessionActivity & { activities: Activity; planned_sets: PlannedSet[]; actual_sets: ActualSet[] }
type SessionPhaseFull = SessionPhase & { session_activities: SessionActivityFull[] }
type SessionFull = Session & { session_phases: SessionPhaseFull[] }

const today = format(new Date(), 'yyyy-MM-dd')

function useTodaySession() {
  return useQuery({
    queryKey: ['track_session', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select(
          `*, session_phases(*, session_activities(*, activities(*), planned_sets(*), actual_sets(*)))`,
        )
        .eq('session_date', today)
        .order('sort_order', { referencedTable: 'session_phases' })
        .order('sort_order', { referencedTable: 'session_phases.session_activities' })
        .order('set_number', { referencedTable: 'session_phases.session_activities.planned_sets' })
        .maybeSingle()
      if (error) throw error
      return data as unknown as SessionFull | null
    },
  })
}

const startSchema = {
  perceived_recovery: undefined as number | undefined,
}

function StartSessionForm({ sessionId }: { sessionId: string }) {
  const queryClient = useQueryClient()
  const [recovery, setRecovery] = useState<number | undefined>(startSchema.perceived_recovery)
  const [environment, setEnvironment] = useState<Environment | ''>('')
  const [temperatureF, setTemperatureF] = useState('')
  const [humidityPct, setHumidityPct] = useState('')
  const [startTime, setStartTime] = useState(format(new Date(), 'HH:mm'))

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('sessions')
        .update({
          perceived_recovery: recovery,
          environment: environment || null,
          temperature_f: temperatureF ? Number(temperatureF) : null,
          humidity_pct: humidityPct ? Number(humidityPct) : null,
          start_time: startTime,
          status: 'in_progress',
        })
        .eq('id', sessionId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['track_session', today] }),
  })

  const valid = recovery !== undefined && environment !== '' && startTime

  return (
    <div className="space-y-6">
      <RatingScale max={10} label="Perceived recovery from prior workout" value={recovery} onChange={setRecovery} />

      <div>
        <span className="mb-2 block text-sm font-medium text-slate-200">Environment</span>
        <div className="flex gap-2">
          {(['indoor', 'outdoor', 'both'] as Environment[]).map((opt) => (
            <label key={opt} className="flex items-center gap-2 rounded-md bg-slate-800 px-3 py-2 capitalize">
              <input type="radio" checked={environment === opt} onChange={() => setEnvironment(opt)} />
              {opt}
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-200">Temperature (°F)</span>
          <input
            type="number"
            step="0.1"
            value={temperatureF}
            onChange={(e) => setTemperatureF(e.target.value)}
            className="w-full rounded-md bg-slate-800 px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-200">Humidity (%)</span>
          <input
            type="number"
            step="0.1"
            value={humidityPct}
            onChange={(e) => setHumidityPct(e.target.value)}
            className="w-full rounded-md bg-slate-800 px-3 py-2"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-slate-200">Start time</span>
        <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full rounded-md bg-slate-800 px-3 py-2" />
      </label>

      <button
        type="button"
        disabled={!valid || mutation.isPending}
        onClick={() => mutation.mutate()}
        className="w-full rounded-md bg-sky-500 py-2.5 font-medium text-white disabled:opacity-40"
      >
        {mutation.isPending ? 'Starting…' : 'Start session'}
      </button>
    </div>
  )
}

function ActualSetEditor({
  sessionActivityId,
  activityType,
  setNumber,
  planned,
  actual,
}: {
  sessionActivityId: string
  activityType: ActivityType
  setNumber: number
  planned: PlannedSet
  actual: ActualSet | undefined
}) {
  const queryClient = useQueryClient()
  const [details, setDetails] = useState<Details>(() =>
    payloadToDisplay((actual?.details ?? planned.details) as Record<string, unknown>),
  )

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('actual_sets').upsert(
        {
          planned_set_id: planned.id,
          session_activity_id: sessionActivityId,
          set_number: setNumber,
          details: detailsToPayload(details),
        },
        { onConflict: 'session_activity_id,set_number' },
      )
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['track_session', today] }),
  })

  return (
    <div className={`rounded-md border p-3 ${actual ? 'border-emerald-800 bg-emerald-950/20' : 'border-slate-800 bg-slate-900/50'}`}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-300">
          Set {setNumber} {actual && <span className="text-emerald-400">— recorded</span>}
        </span>
        <button
          type="button"
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="rounded bg-sky-500 px-2 py-1 text-xs font-medium text-white disabled:opacity-40"
        >
          {mutation.isPending ? 'Saving…' : actual ? 'Update' : 'Save'}
        </button>
      </div>
      <DetailsFields type={activityType} details={details} setDetail={(k, v) => setDetails((d) => ({ ...d, [k]: v }))} />
    </div>
  )
}

function FinishSessionForm({ sessionId }: { sessionId: string }) {
  const queryClient = useQueryClient()
  const { control, handleSubmit, formState } = useForm<{ session_fatigue: number; pain_intensity: number; session_focus: number }>()

  const mutation = useMutation({
    mutationFn: async (values: { session_fatigue: number; pain_intensity: number; session_focus: number }) => {
      const { error } = await supabase.from('sessions').update({ ...values, status: 'completed' }).eq('id', sessionId)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['track_session', today] }),
  })

  return (
    <form
      className="mt-8 space-y-6 rounded-lg border border-slate-800 p-4"
      onSubmit={handleSubmit((values) => mutation.mutate(values))}
    >
      <h2 className="text-lg font-medium text-slate-100">Finish session</h2>
      <Controller
        name="session_fatigue"
        control={control}
        rules={{ required: true }}
        render={({ field }) => <RatingScale max={10} label="Session fatigue" value={field.value} onChange={field.onChange} />}
      />
      <Controller
        name="pain_intensity"
        control={control}
        rules={{ required: true }}
        render={({ field }) => <RatingScale max={10} label="Pain intensity" value={field.value} onChange={field.onChange} />}
      />
      <Controller
        name="session_focus"
        control={control}
        rules={{ required: true }}
        render={({ field }) => <RatingScale max={10} label="Session focus" value={field.value} onChange={field.onChange} />}
      />
      <button
        type="submit"
        disabled={!formState.isValid || mutation.isPending}
        className="w-full rounded-md bg-sky-500 py-2.5 font-medium text-white disabled:opacity-40"
      >
        {mutation.isPending ? 'Saving…' : 'Finish session'}
      </button>
    </form>
  )
}

export default function TrackSession() {
  const { data: session, isLoading } = useTodaySession()

  if (isLoading) return <PageShell title="Track today's session">Loading…</PageShell>

  if (!session) {
    return (
      <PageShell title="Track today's session" description={today}>
        <p className="text-sm text-slate-400">No plan exists for today yet — plan it first from a laptop.</p>
      </PageShell>
    )
  }

  if (session.status === 'planned') {
    return (
      <PageShell title="Track today's session" description={today}>
        <StartSessionForm sessionId={session.id} />
      </PageShell>
    )
  }

  return (
    <PageShell title="Track today's session" description={today}>
      <div className="space-y-8">
        {session.session_phases.map((phase) => (
          <div key={phase.id}>
            <h2 className="mb-3 text-lg font-medium text-slate-100">{PHASE_LABEL[phase.phase]}</h2>
            <div className="space-y-4">
              {phase.session_activities.map((sa) => (
                <div key={sa.id} className="rounded-lg border border-slate-800 p-3">
                  <div className="mb-3">
                    <div className="font-medium">{sa.activities.name}</div>
                    <div className="text-xs uppercase tracking-wide text-slate-500">{sa.activities.type}</div>
                  </div>
                  <div className="space-y-2">
                    {sa.planned_sets.map((planned) => (
                      <ActualSetEditor
                        key={planned.id}
                        sessionActivityId={sa.id}
                        activityType={sa.activities.type}
                        setNumber={planned.set_number}
                        planned={planned}
                        actual={sa.actual_sets.find((a) => a.set_number === planned.set_number)}
                      />
                    ))}
                    {sa.planned_sets.length === 0 && <p className="text-sm text-slate-500">No planned sets for this activity.</p>}
                  </div>
                </div>
              ))}
              {phase.session_activities.length === 0 && <p className="text-sm text-slate-500">Nothing planned for this phase.</p>}
            </div>
          </div>
        ))}
      </div>

      {session.status === 'in_progress' && <FinishSessionForm sessionId={session.id} />}
      {session.status === 'completed' && <p className="mt-8 text-sm text-emerald-400">Session completed.</p>}
    </PageShell>
  )
}
