import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { supabase } from '../../lib/supabase'
import { PageShell } from '../../components/PageShell'

const schema = z.object({
  period: z.enum(['morning', 'evening']),
  weight_lbs: z.string().min(1, 'Required'),
  logged_at: z.string().min(1, 'Required'),
})

type FormValues = z.infer<typeof schema>

const today = format(new Date(), 'yyyy-MM-dd')
const nowTime = format(new Date(), 'HH:mm')

export default function WeightLog() {
  const queryClient = useQueryClient()

  const { data: logs } = useQuery({
    queryKey: ['weight_logs', today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('weight_logs')
        .select('*')
        .eq('log_date', today)
        .order('period')
      if (error) throw error
      return data ?? []
    },
  })

  const { register, handleSubmit, reset, formState } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { period: 'morning', weight_lbs: '', logged_at: nowTime },
  })

  const mutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const { error } = await supabase.from('weight_logs').upsert(
        {
          log_date: today,
          period: values.period,
          weight_lbs: Number(values.weight_lbs),
          logged_at: values.logged_at,
        },
        { onConflict: 'log_date,period' },
      )
      if (error) throw error
    },
    onSuccess: (_data, values) => {
      queryClient.invalidateQueries({ queryKey: ['weight_logs', today] })
      reset({ period: values.period === 'morning' ? 'evening' : 'morning', weight_lbs: '', logged_at: nowTime })
    },
  })

  const morning = logs?.find((l) => l.period === 'morning')
  const evening = logs?.find((l) => l.period === 'evening')

  return (
    <PageShell title="Weight" description="Morning and evening weigh-ins.">
      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-slate-800 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Morning</div>
          <div className="mt-1 text-lg font-medium">
            {morning ? `${morning.weight_lbs} lbs` : '—'}
          </div>
          {morning && <div className="text-xs text-slate-500">{morning.logged_at}</div>}
        </div>
        <div className="rounded-lg border border-slate-800 p-3">
          <div className="text-xs uppercase tracking-wide text-slate-500">Evening</div>
          <div className="mt-1 text-lg font-medium">
            {evening ? `${evening.weight_lbs} lbs` : '—'}
          </div>
          {evening && <div className="text-xs text-slate-500">{evening.logged_at}</div>}
        </div>
      </div>

      <form className="space-y-4" onSubmit={handleSubmit((values) => mutation.mutate(values))}>
        <div>
          <span className="mb-2 block text-sm font-medium text-slate-200">Weigh-in</span>
          <div className="flex gap-2">
            <label className="flex items-center gap-2 rounded-md bg-slate-800 px-3 py-2">
              <input type="radio" value="morning" {...register('period')} />
              Morning
            </label>
            <label className="flex items-center gap-2 rounded-md bg-slate-800 px-3 py-2">
              <input type="radio" value="evening" {...register('period')} />
              Evening
            </label>
          </div>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-200">Weight (lbs)</span>
          <input
            type="number"
            step="0.1"
            {...register('weight_lbs')}
            className="w-full rounded-md bg-slate-800 px-3 py-2"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-200">Time</span>
          <input type="time" {...register('logged_at')} className="w-full rounded-md bg-slate-800 px-3 py-2" />
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
