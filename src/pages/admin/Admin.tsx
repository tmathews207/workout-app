import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { PageShell } from '../../components/PageShell'
import type { Modality, RatingDescription, RatingScaleKey } from '../../types/database'

const SCALE_LABELS: Record<RatingScaleKey, string> = {
  recovery: 'Recovery from prior workout',
  session_fatigue: 'Session fatigue',
  pain_intensity: 'Pain intensity',
  session_focus: 'Session focus',
  sleep_quality: 'Sleep quality',
  energy_level: 'Energy level',
  stress_management: 'Stress management',
  focus_level: 'Focus level',
  work_life_balance: 'Work-life balance',
  noise: 'Noise',
  light: 'Light',
  temperature: 'Temperature',
  humidity: 'Humidity',
}

function ModalitiesSection() {
  const queryClient = useQueryClient()
  const [key, setKey] = useState('')
  const [label, setLabel] = useState('')

  const { data: modalities } = useQuery({
    queryKey: ['modalities'],
    queryFn: async () => {
      const { data, error } = await supabase.from('modalities').select('*').order('sort_order')
      if (error) throw error
      return data as Modality[]
    },
  })

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('modalities')
        .insert({ key, label, sort_order: (modalities?.length ?? 0) + 1 })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['modalities'] })
      setKey('')
      setLabel('')
    },
  })

  const renameMutation = useMutation({
    mutationFn: async ({ id, label }: { id: string; label: string }) => {
      const { error } = await supabase.from('modalities').update({ label }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['modalities'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('modalities').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['modalities'] }),
    onError: () => alert('Could not delete — this modality is probably still used by an activity.'),
  })

  return (
    <section className="mb-10">
      <h2 className="mb-3 text-lg font-medium text-slate-100">Modalities</h2>
      <div className="mb-4 space-y-2">
        {(modalities ?? []).map((m) => (
          <div key={m.id} className="flex items-center gap-2">
            <input
              defaultValue={m.label}
              onBlur={(e) => e.target.value !== m.label && renameMutation.mutate({ id: m.id, label: e.target.value })}
              className="flex-1 rounded-md bg-slate-800 px-3 py-1.5 text-sm"
            />
            <span className="w-28 text-xs text-slate-500">{m.key}</span>
            <button type="button" onClick={() => deleteMutation.mutate(m.id)} className="rounded bg-slate-800 px-2 py-1 text-xs text-red-400">
              Delete
            </button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input placeholder="key (e.g. lunge)" value={key} onChange={(e) => setKey(e.target.value)} className="w-40 rounded-md bg-slate-800 px-3 py-1.5 text-sm" />
        <input placeholder="Label" value={label} onChange={(e) => setLabel(e.target.value)} className="flex-1 rounded-md bg-slate-800 px-3 py-1.5 text-sm" />
        <button
          type="button"
          disabled={!key || !label}
          onClick={() => addMutation.mutate()}
          className="rounded-md bg-sky-500 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-40"
        >
          Add
        </button>
      </div>
    </section>
  )
}

function RatingDescriptionsSection() {
  const queryClient = useQueryClient()
  const { data: rows } = useQuery({
    queryKey: ['rating_descriptions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('rating_descriptions').select('*').order('scale_key').order('rating', { ascending: false })
      if (error) throw error
      return data as RatingDescription[]
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ scale_key, rating, description }: RatingDescription) => {
      const { error } = await supabase
        .from('rating_descriptions')
        .update({ description })
        .eq('scale_key', scale_key)
        .eq('rating', rating)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['rating_descriptions'] }),
  })

  const grouped = new Map<RatingScaleKey, RatingDescription[]>()
  for (const row of rows ?? []) {
    const list = grouped.get(row.scale_key) ?? []
    list.push(row)
    grouped.set(row.scale_key, list)
  }

  return (
    <section className="mb-10">
      <h2 className="mb-3 text-lg font-medium text-slate-100">Rating descriptions</h2>
      <div className="space-y-6">
        {[...grouped.entries()].map(([scaleKey, descriptions]) => (
          <div key={scaleKey}>
            <h3 className="mb-2 text-sm font-semibold text-slate-300">{SCALE_LABELS[scaleKey]}</h3>
            <div className="space-y-1">
              {descriptions.map((d) => (
                <div key={d.rating} className="flex items-center gap-2">
                  <span className="w-5 text-sm text-slate-500">{d.rating}</span>
                  <input
                    defaultValue={d.description}
                    onBlur={(e) => e.target.value !== d.description && updateMutation.mutate({ ...d, description: e.target.value })}
                    className="flex-1 rounded-md bg-slate-800 px-3 py-1.5 text-sm"
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function useDeletableList<T extends { id: string }>(table: string, dateColumn: string) {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: ['admin_list', table],
    queryFn: async () => {
      const { data, error } = await supabase.from(table).select('*').order(dateColumn, { ascending: false }).limit(30)
      if (error) throw error
      return data as T[]
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin_list', table] }),
  })

  return { ...query, deleteMutation }
}

// Weight supports inline edit (two simple fields). Sleep, readiness, and
// sessions are delete-only for now — editing those in place would need
// their tracking pages to accept an arbitrary date instead of always
// today, which is a bigger change than this admin view covers yet.
function PastEntriesSection() {
  const sleep = useDeletableList<{ id: string; log_date: string; quality: number | null }>('sleep_logs', 'log_date')
  const weight = useDeletableList<{ id: string; log_date: string; period: string; weight_lbs: number }>('weight_logs', 'log_date')
  const queryClient = useQueryClient()
  const updateWeightMutation = useMutation({
    mutationFn: async ({ id, weight_lbs }: { id: string; weight_lbs: number }) => {
      const { error } = await supabase.from('weight_logs').update({ weight_lbs }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin_list', 'weight_logs'] }),
  })
  const readiness = useDeletableList<{ id: string; log_date: string; energy_level: number | null }>('readiness_logs', 'log_date')
  const sessions = useDeletableList<{ id: string; session_date: string; status: string }>('sessions', 'session_date')

  return (
    <section>
      <h2 className="mb-3 text-lg font-medium text-slate-100">Past entries</h2>
      <p className="mb-4 text-sm text-slate-500">Last 30 entries per type. Delete removes the entry (and, for sessions, its plan and logged sets).</p>

      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-300">Sleep</h3>
          <div className="space-y-1">
            {(sleep.data ?? []).map((row) => (
              <div key={row.id} className="flex items-center justify-between rounded-md bg-slate-900/50 px-3 py-1.5 text-sm">
                <span>{row.log_date} {row.quality != null && `— quality ${row.quality}`}</span>
                <button type="button" onClick={() => sleep.deleteMutation.mutate(row.id)} className="text-xs text-red-400">
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-300">Weight</h3>
          <div className="space-y-1">
            {(weight.data ?? []).map((row) => (
              <div key={row.id} className="flex items-center justify-between gap-2 rounded-md bg-slate-900/50 px-3 py-1.5 text-sm">
                <span className="shrink-0">{row.log_date} ({row.period})</span>
                <input
                  type="number"
                  step="0.1"
                  defaultValue={row.weight_lbs}
                  onBlur={(e) => {
                    const v = Number(e.target.value)
                    if (v !== row.weight_lbs) updateWeightMutation.mutate({ id: row.id, weight_lbs: v })
                  }}
                  className="w-20 rounded bg-slate-800 px-2 py-1 text-right"
                />
                <button type="button" onClick={() => weight.deleteMutation.mutate(row.id)} className="text-xs text-red-400">
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-300">Readiness</h3>
          <div className="space-y-1">
            {(readiness.data ?? []).map((row) => (
              <div key={row.id} className="flex items-center justify-between rounded-md bg-slate-900/50 px-3 py-1.5 text-sm">
                <span>{row.log_date} {row.energy_level != null && `— energy ${row.energy_level}`}</span>
                <button type="button" onClick={() => readiness.deleteMutation.mutate(row.id)} className="text-xs text-red-400">
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-slate-300">Sessions</h3>
          <div className="space-y-1">
            {(sessions.data ?? []).map((row) => (
              <div key={row.id} className="flex items-center justify-between rounded-md bg-slate-900/50 px-3 py-1.5 text-sm">
                <span>{row.session_date} — {row.status}</span>
                <button type="button" onClick={() => sessions.deleteMutation.mutate(row.id)} className="text-xs text-red-400">
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default function Admin() {
  return (
    <PageShell title="Admin" description="Modalities, rating descriptions, and past entries.">
      <ModalitiesSection />
      <RatingDescriptionsSection />
      <PastEntriesSection />
    </PageShell>
  )
}
