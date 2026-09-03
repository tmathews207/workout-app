import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { PageShell } from '../../components/PageShell'
import { DetailsFields, TextField, detailsToPayload, payloadToDisplay, type Details } from '../../components/activityFields'
import type { Activity, ActivityType, Modality } from '../../types/database'

const ACTIVITY_TYPES: { value: ActivityType; label: string }[] = [
  { value: 'stretch', label: 'Stretch' },
  { value: 'mobility', label: 'Mobility' },
  { value: 'strength', label: 'Strength' },
  { value: 'power', label: 'Power' },
  { value: 'anaerobic', label: 'Anaerobic / muscular endurance' },
  { value: 'aerobic', label: 'Aerobic' },
]

interface FormState {
  id?: string
  type: ActivityType
  name: string
  notes: string
  modalityIds: string[]
  details: Details
}

const emptyForm: FormState = { type: 'strength', name: '', notes: '', modalityIds: [], details: {} }

type ActivityWithModalities = Activity & { activity_modalities: { modality_id: string }[] }

function useActivities() {
  return useQuery({
    queryKey: ['activities'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('activities')
        .select('*, activity_modalities(modality_id)')
        .order('type')
        .order('name')
      if (error) throw error
      return data as ActivityWithModalities[]
    },
  })
}

function useModalities() {
  return useQuery({
    queryKey: ['modalities'],
    queryFn: async () => {
      const { data, error } = await supabase.from('modalities').select('*').order('sort_order')
      if (error) throw error
      return data as Modality[]
    },
  })
}

export default function ActivityLibrary() {
  const queryClient = useQueryClient()
  const { data: activities, isLoading } = useActivities()
  const { data: modalities } = useModalities()
  const [form, setForm] = useState<FormState | null>(null)

  const saveMutation = useMutation({
    mutationFn: async (f: FormState) => {
      const payload = { type: f.type, name: f.name, notes: f.notes || null, details: detailsToPayload(f.details) }
      let activityId = f.id
      if (activityId) {
        const { error } = await supabase.from('activities').update(payload).eq('id', activityId)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('activities').insert(payload).select('id').single()
        if (error) throw error
        activityId = data.id
      }
      await supabase.from('activity_modalities').delete().eq('activity_id', activityId)
      if (f.modalityIds.length > 0) {
        const { error } = await supabase
          .from('activity_modalities')
          .insert(f.modalityIds.map((modality_id) => ({ activity_id: activityId, modality_id })))
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activities'] })
      setForm(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('activities').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['activities'] }),
  })

  function startEdit(activity: ActivityWithModalities) {
    setForm({
      id: activity.id,
      type: activity.type,
      name: activity.name,
      notes: activity.notes ?? '',
      modalityIds: activity.activity_modalities.map((m) => m.modality_id),
      details: payloadToDisplay(activity.details as Record<string, unknown>),
    })
  }

  return (
    <PageShell title="Activity library" description="Add, edit, and remove activities.">
      {!form && (
        <button
          type="button"
          onClick={() => setForm({ ...emptyForm })}
          className="mb-6 rounded-md bg-sky-500 px-4 py-2 font-medium text-white"
        >
          + Add activity
        </button>
      )}

      {form && (
        <form
          className="mb-8 space-y-4 rounded-lg border border-slate-800 p-4"
          onSubmit={(e) => {
            e.preventDefault()
            saveMutation.mutate(form)
          }}
        >
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-200">Type</span>
            <select
              value={form.type}
              disabled={Boolean(form.id)}
              onChange={(e) => setForm({ ...form, type: e.target.value as ActivityType, details: {} })}
              className="w-full rounded-md bg-slate-800 px-3 py-2 disabled:opacity-50"
            >
              {ACTIVITY_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>

          <TextField label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />

          <DetailsFields
            type={form.type}
            details={form.details}
            setDetail={(k, v) => setForm({ ...form, details: { ...form.details, [k]: v } })}
          />

          <div>
            <span className="mb-2 block text-sm font-medium text-slate-200">Modalities</span>
            <div className="flex flex-wrap gap-2">
              {(modalities ?? []).map((m) => (
                <label key={m.id} className="flex items-center gap-2 rounded-md bg-slate-800 px-3 py-2">
                  <input
                    type="checkbox"
                    checked={form.modalityIds.includes(m.id)}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        modalityIds: e.target.checked
                          ? [...form.modalityIds, m.id]
                          : form.modalityIds.filter((id) => id !== m.id),
                      })
                    }
                  />
                  {m.label}
                </label>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-200">Notes</span>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full rounded-md bg-slate-800 px-3 py-2"
            />
          </label>

          {saveMutation.isError && <p className="text-sm text-red-400">Could not save — try again.</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!form.name || saveMutation.isPending}
              className="rounded-md bg-sky-500 px-4 py-2 font-medium text-white disabled:opacity-40"
            >
              {saveMutation.isPending ? 'Saving…' : 'Save'}
            </button>
            <button type="button" onClick={() => setForm(null)} className="rounded-md bg-slate-800 px-4 py-2 text-slate-200">
              Cancel
            </button>
          </div>
        </form>
      )}

      {isLoading && <p className="text-sm text-slate-400">Loading…</p>}

      <div className="space-y-2">
        {(activities ?? []).map((a) => (
          <div key={a.id} className="flex items-center justify-between rounded-lg border border-slate-800 p-3">
            <div>
              <div className="font-medium">{a.name}</div>
              <div className="text-xs uppercase tracking-wide text-slate-500">{a.type}</div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => startEdit(a)} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm text-slate-200">
                Edit
              </button>
              <button
                type="button"
                onClick={() => confirm(`Delete "${a.name}"?`) && deleteMutation.mutate(a.id)}
                className="rounded-md bg-slate-800 px-3 py-1.5 text-sm text-red-400"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  )
}
