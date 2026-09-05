import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { PageShell } from '../../components/PageShell'
import { RatingScale } from '../../components/RatingScale'

const schema = z.object({
  quality: z.number().min(1).max(10),
  noise: z.number().min(1).max(5),
  light: z.number().min(1).max(5),
  temperature_rating: z.number().min(1).max(5),
  humidity_rating: z.number().min(1).max(5),
})

type FormValues = z.infer<typeof schema>

const today = format(new Date(), 'yyyy-MM-dd')

export default function SleepSubjective() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: existing, isLoading } = useQuery({
    queryKey: ['sleep_logs', today],
    queryFn: async () => {
      const { data, error } = await supabase.from('sleep_logs').select('*').eq('log_date', today).maybeSingle()
      if (error) throw error
      return data
    },
  })

  const { control, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: existing
      ? {
          quality: existing.quality ?? undefined,
          noise: existing.noise ?? undefined,
          light: existing.light ?? undefined,
          temperature_rating: existing.temperature_rating ?? undefined,
          humidity_rating: existing.humidity_rating ?? undefined,
        }
      : undefined,
  })

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const { error } = await supabase.from('sleep_logs').upsert(
        {
          log_date: today,
          ...values,
          subjective_completed_at: new Date().toISOString(),
        },
        { onConflict: 'log_date' },
      )
      if (error) throw error
    },
    onSuccess: (_data, values) => {
      // Write the saved fields straight into the cache instead of just
      // invalidating: invalidate() only schedules a background refetch, and
      // the objective screen (which reads this same query key to check
      // subjective_completed_at) can mount and read the still-stale cached
      // value before that refetch resolves, bouncing itself back here.
      queryClient.setQueryData(['sleep_logs', today], (old: Record<string, unknown> | null | undefined) => ({
        ...(old ?? { log_date: today }),
        ...values,
        subjective_completed_at: new Date().toISOString(),
      }))
      queryClient.invalidateQueries({ queryKey: ['sleep_logs', today] })
      navigate('/sleep/objective')
    },
  })

  if (isLoading) return <PageShell title="Sleep — how did it feel?">Loading…</PageShell>

  return (
    <PageShell
      title="Sleep — how did it feel?"
      description={`For the night ending this morning, ${format(new Date(), 'MMMM d, yyyy')}. Objective data comes next.`}
    >
      <form className="space-y-6" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
        <Controller
          name="quality"
          control={control}
          render={({ field }) => (
            <RatingScale max={10} label="Sleep quality" scaleKey="sleep_quality" value={field.value} onChange={field.onChange} />
          )}
        />
        <Controller
          name="noise"
          control={control}
          render={({ field }) => (
            <RatingScale max={5} label="Noise" scaleKey="noise" value={field.value} onChange={field.onChange} />
          )}
        />
        <Controller
          name="light"
          control={control}
          render={({ field }) => (
            <RatingScale max={5} label="Light" scaleKey="light" value={field.value} onChange={field.onChange} />
          )}
        />
        <Controller
          name="temperature_rating"
          control={control}
          render={({ field }) => (
            <RatingScale max={5} label="Temperature" scaleKey="temperature" value={field.value} onChange={field.onChange} />
          )}
        />
        <Controller
          name="humidity_rating"
          control={control}
          render={({ field }) => (
            <RatingScale max={5} label="Humidity" scaleKey="humidity" value={field.value} onChange={field.onChange} />
          )}
        />

        {mutation.isError && (
          <p className="text-sm text-red-400">Could not save — check your connection and try again.</p>
        )}

        <button
          type="submit"
          disabled={!formState.isValid || mutation.isPending}
          className="w-full rounded-md bg-sky-500 py-2.5 font-medium text-white disabled:opacity-40"
        >
          {mutation.isPending ? 'Saving…' : 'Next: objective data'}
        </button>
      </form>
    </PageShell>
  )
}
