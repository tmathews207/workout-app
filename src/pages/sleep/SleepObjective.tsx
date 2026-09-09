import { useEffect } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { PageShell } from '../../components/PageShell'
import { formatHHMM, parseHHMM } from '../../lib/format'
import { DateNav } from '../../components/DateNav'
import { useLogDate } from '../../lib/useLogDate'
import { SplitTimeField } from '../../components/SplitTimeField'

// Numeric fields are kept as strings at the form layer (native number
// inputs hand back strings) and converted right before the write — avoids
// react-hook-form/zod input-vs-output generic gymnastics for a scaffold.
const schema = z.object({
  bedtime: z.string().min(1, 'Required'),
  wake_time: z.string().min(1, 'Required'),
  total_hours_slept: z
    .string()
    .min(1, 'Required')
    .refine((v) => parseHHMM(v) !== undefined, 'Use hh:mm format, e.g. 7:30'),
  wearable_sleep_score: z.string().optional(),
  temperature_f: z.string().optional(),
  humidity_pct: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const BLANK: FormValues = {
  bedtime: '',
  wake_time: '',
  total_hours_slept: '',
  wearable_sleep_score: '',
  temperature_f: '',
  humidity_pct: '',
}

export default function SleepObjective() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { date, setDate, today } = useLogDate()

  const { data: log, isLoading } = useQuery({
    queryKey: ['sleep_logs', date],
    queryFn: async () => {
      const { data, error } = await supabase.from('sleep_logs').select('*').eq('log_date', date).maybeSingle()
      if (error) throw error
      return data
    },
  })

  // Subjective screen must be completed first.
  useEffect(() => {
    if (!isLoading && !log?.subjective_completed_at) {
      navigate(date === today ? '/sleep' : `/sleep?date=${date}`, { replace: true })
    }
  }, [isLoading, log, navigate, date, today])

  const { register, control, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: log
      ? {
          bedtime: log.bedtime ?? '',
          wake_time: log.wake_time ?? '',
          total_hours_slept: formatHHMM(log.total_hours_slept),
          wearable_sleep_score: log.wearable_sleep_score != null ? String(log.wearable_sleep_score) : '',
          temperature_f: log.temperature_f != null ? String(log.temperature_f) : '',
          humidity_pct: log.humidity_pct != null ? String(log.humidity_pct) : '',
        }
      : BLANK,
  })

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const { error } = await supabase
        .from('sleep_logs')
        .update({
          bedtime: values.bedtime,
          wake_time: values.wake_time,
          total_hours_slept: parseHHMM(values.total_hours_slept),
          wearable_sleep_score: values.wearable_sleep_score ? Number(values.wearable_sleep_score) : null,
          temperature_f: values.temperature_f ? Number(values.temperature_f) : null,
          humidity_pct: values.humidity_pct ? Number(values.humidity_pct) : null,
          objective_completed_at: new Date().toISOString(),
        })
        .eq('log_date', date)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sleep_logs', date] })
      navigate('/')
    },
  })

  if (isLoading) return <PageShell title="Sleep — the details">Loading…</PageShell>

  return (
    <PageShell title="Sleep — the details" description="Bed time, wake time, and wearable data.">
      <DateNav date={date} today={today} onChange={setDate} />

      <form className="space-y-4" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-200">Went to bed</span>
          <input type="time" {...register('bedtime')} className="w-full rounded-md bg-slate-800 px-3 py-2" />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-200">Woke up</span>
          <input type="time" {...register('wake_time')} className="w-full rounded-md bg-slate-800 px-3 py-2" />
        </label>
        <div>
          <Controller
            name="total_hours_slept"
            control={control}
            render={({ field }) => (
              <SplitTimeField label="Total sleep (hh:mm)" firstLabel="hh" value={field.value} onChange={field.onChange} />
            )}
          />
          {formState.errors.total_hours_slept && (
            <p className="mt-1 text-xs text-red-400">{formState.errors.total_hours_slept.message}</p>
          )}
        </div>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-200">Wearable sleep score</span>
          <input
            type="number"
            inputMode="numeric"
            {...register('wearable_sleep_score')}
            className="w-full rounded-md bg-slate-800 px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-200">Temperature (°F)</span>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            {...register('temperature_f')}
            className="w-full rounded-md bg-slate-800 px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-200">Humidity (%)</span>
          <input
            type="number"
            inputMode="decimal"
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
