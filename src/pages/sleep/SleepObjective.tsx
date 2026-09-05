import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { PageShell } from '../../components/PageShell'

// Numeric fields are kept as strings at the form layer (native number
// inputs hand back strings) and converted right before the write — avoids
// react-hook-form/zod input-vs-output generic gymnastics for a scaffold.
const schema = z.object({
  bedtime: z.string().min(1, 'Required'),
  wake_time: z.string().min(1, 'Required'),
  total_hours_slept: z.string().min(1, 'Required'),
  wearable_sleep_score: z.string().optional(),
  temperature_f: z.string().optional(),
  humidity_pct: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const today = format(new Date(), 'yyyy-MM-dd')

export default function SleepObjective() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: log, isLoading } = useQuery({
    queryKey: ['sleep_logs', today],
    queryFn: async () => {
      const { data, error } = await supabase.from('sleep_logs').select('*').eq('log_date', today).maybeSingle()
      if (error) throw error
      return data
    },
  })

  // Subjective screen must be completed first.
  useEffect(() => {
    if (!isLoading && !log?.subjective_completed_at) {
      navigate('/sleep', { replace: true })
    }
  }, [isLoading, log, navigate])

  const { register, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: log
      ? {
          bedtime: log.bedtime ?? '',
          wake_time: log.wake_time ?? '',
          total_hours_slept: log.total_hours_slept != null ? String(log.total_hours_slept) : '',
          wearable_sleep_score: log.wearable_sleep_score != null ? String(log.wearable_sleep_score) : '',
          temperature_f: log.temperature_f != null ? String(log.temperature_f) : '',
          humidity_pct: log.humidity_pct != null ? String(log.humidity_pct) : '',
        }
      : undefined,
  })

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const { error } = await supabase
        .from('sleep_logs')
        .update({
          bedtime: values.bedtime,
          wake_time: values.wake_time,
          total_hours_slept: Number(values.total_hours_slept),
          wearable_sleep_score: values.wearable_sleep_score ? Number(values.wearable_sleep_score) : null,
          temperature_f: values.temperature_f ? Number(values.temperature_f) : null,
          humidity_pct: values.humidity_pct ? Number(values.humidity_pct) : null,
          objective_completed_at: new Date().toISOString(),
        })
        .eq('log_date', today)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sleep_logs', today] })
      navigate('/')
    },
  })

  if (isLoading) return <PageShell title="Sleep — the details">Loading…</PageShell>

  return (
    <PageShell title="Sleep — the details" description="Bed time, wake time, and wearable data.">
      <form className="space-y-4" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-200">Went to bed</span>
          <input type="time" {...register('bedtime')} className="w-full rounded-md bg-slate-800 px-3 py-2" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-200">Woke up</span>
          <input type="time" {...register('wake_time')} className="w-full rounded-md bg-slate-800 px-3 py-2" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-200">Total hours slept</span>
          <input
            type="number"
            step="0.1"
            {...register('total_hours_slept')}
            className="w-full rounded-md bg-slate-800 px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-200">Wearable sleep score</span>
          <input
            type="number"
            {...register('wearable_sleep_score')}
            className="w-full rounded-md bg-slate-800 px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-200">Temperature (°F)</span>
          <input
            type="number"
            step="0.1"
            {...register('temperature_f')}
            className="w-full rounded-md bg-slate-800 px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-200">Humidity (%)</span>
          <input
            type="number"
            step="0.1"
            {...register('humidity_pct')}
            className="w-full rounded-md bg-slate-800 px-3 py-2"
          />
        </label>

        {mutation.isError && (
          <p className="text-sm text-red-400">Could not save — check your connection and try again.</p>
        )}

        <button
          type="submit"
          disabled={!formState.isValid || mutation.isPending}
          className="w-full rounded-md bg-sky-500 py-2.5 font-medium text-white disabled:opacity-40"
        >
          {mutation.isPending ? 'Saving…' : 'Save'}
        </button>
      </form>
    </PageShell>
  )
}
