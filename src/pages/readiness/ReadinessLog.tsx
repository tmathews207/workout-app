import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { PageShell } from '../../components/PageShell'
import { RatingScale } from '../../components/RatingScale'
import { DateNav } from '../../components/DateNav'
import { useLogDate } from '../../lib/useLogDate'

const schema = z.object({
  energy_level: z.number().min(1).max(10),
  mental_focus: z.number().min(1).max(10),
  stress_level: z.number().min(1).max(10),
  work_life_balance: z.number().min(1).max(10),
  notes: z.string().optional(),
  reading: z.string().optional(),
  reading_notes: z.string().optional(),
  listening: z.string().optional(),
  listening_notes: z.string().optional(),
})

type FormValues = z.infer<typeof schema>

const BLANK: FormValues = {
  energy_level: undefined as unknown as number,
  mental_focus: undefined as unknown as number,
  stress_level: undefined as unknown as number,
  work_life_balance: undefined as unknown as number,
  notes: '',
  reading: '',
  reading_notes: '',
  listening: '',
  listening_notes: '',
}

export default function ReadinessLog() {
  const queryClient = useQueryClient()
  const { date, setDate, today } = useLogDate()

  const { data: existing, isLoading } = useQuery({
    queryKey: ['readiness_logs', date],
    queryFn: async () => {
      const { data, error } = await supabase.from('readiness_logs').select('*').eq('log_date', date).maybeSingle()
      if (error) throw error
      return data
    },
  })

  const { control, register, handleSubmit, formState, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: existing
      ? {
          energy_level: existing.energy_level ?? undefined,
          mental_focus: existing.mental_focus ?? undefined,
          stress_level: existing.stress_level ?? undefined,
          work_life_balance: existing.work_life_balance ?? undefined,
          notes: existing.notes ?? '',
          reading: existing.reading ?? '',
          reading_notes: existing.reading_notes ?? '',
          listening: existing.listening ?? '',
          listening_notes: existing.listening_notes ?? '',
        }
      : BLANK,
  })

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const { error } = await supabase
        .from('readiness_logs')
        .upsert({ log_date: date, ...values }, { onConflict: 'log_date' })
      if (error) throw error
    },
    onSuccess: (_data, values) => {
      queryClient.invalidateQueries({ queryKey: ['readiness_logs', date] })
      reset(values)
    },
  })

  if (isLoading) return <PageShell title="Mental readiness">Loading…</PageShell>

  return (
    <PageShell title="Mental readiness" description="End-of-day ratings, notes, reading & listening.">
      <DateNav date={date} today={today} onChange={setDate} />

      <form className="space-y-6" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
        <Controller
          name="energy_level"
          control={control}
          render={({ field }) => (
            <RatingScale max={10} label="Energy level" scaleKey="energy_level" value={field.value} onChange={field.onChange} />
          )}
        />
        <Controller
          name="mental_focus"
          control={control}
          render={({ field }) => (
            <RatingScale max={10} label="Mental focus" scaleKey="focus_level" value={field.value} onChange={field.onChange} />
          )}
        />
        <Controller
          name="stress_level"
          control={control}
          render={({ field }) => (
            <RatingScale max={10} label="Stress level" scaleKey="stress_management" value={field.value} onChange={field.onChange} />
          )}
        />
        <Controller
          name="work_life_balance"
          control={control}
          render={({ field }) => (
            <RatingScale max={10} label="Work-life balance" scaleKey="work_life_balance" value={field.value} onChange={field.onChange} />
          )}
        />

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-200">Notes</span>
          <textarea rows={3} {...register('notes')} className="w-full rounded-md bg-slate-800 px-3 py-2" />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-200">Reading</span>
            <input {...register('reading')} className="w-full rounded-md bg-slate-800 px-3 py-2" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-200">Reading notes</span>
            <input {...register('reading_notes')} className="w-full rounded-md bg-slate-800 px-3 py-2" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-200">Listening</span>
            <input {...register('listening')} className="w-full rounded-md bg-slate-800 px-3 py-2" />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-200">Listening notes</span>
            <input {...register('listening_notes')} className="w-full rounded-md bg-slate-800 px-3 py-2" />
          </label>
        </div>

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
