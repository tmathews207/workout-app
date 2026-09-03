import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
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

  const { control, handleSubmit, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sleep_logs', today] })
      navigate('/sleep/objective')
    },
  })

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
            <RatingScale max={10} label="Sleep quality" value={field.value} onChange={field.onChange} />
          )}
        />
        <Controller
          name="noise"
          control={control}
          render={({ field }) => (
            <RatingScale max={5} label="Noise" value={field.value} onChange={field.onChange} />
          )}
        />
        <Controller
          name="light"
          control={control}
          render={({ field }) => (
            <RatingScale max={5} label="Light" value={field.value} onChange={field.onChange} />
          )}
        />
        <Controller
          name="temperature_rating"
          control={control}
          render={({ field }) => (
            <RatingScale max={5} label="Temperature" value={field.value} onChange={field.onChange} />
          )}
        />
        <Controller
          name="humidity_rating"
          control={control}
          render={({ field }) => (
            <RatingScale max={5} label="Humidity" value={field.value} onChange={field.onChange} />
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
