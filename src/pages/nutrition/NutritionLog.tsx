import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { supabase } from '../../lib/supabase'
import { PageShell } from '../../components/PageShell'
import type { NutritionLog } from '../../types/database'

const today = format(new Date(), 'yyyy-MM-dd')

const DEFAULTS: Omit<NutritionLog, 'id' | 'log_date' | 'created_at' | 'updated_at'> = {
  water_oz_1: 20,
  water_oz_2: 20,
  water_oz_3: 20,
  milk_oz_1: 20,
  milk_oz_2: 20,
  fruit_1: null,
  fruit_2: null,
  fruit_3: null,
  fruit_4: null,
  vegetable_1: null,
  vegetable_2: null,
  vegetable_3: null,
  vegetable_4: null,
  multivitamin_taken: false,
  creatine_taken: false,
  coffee_caffeine_mg_1: 90,
  coffee_caffeine_mg_2: 90,
  coffee_caffeine_mg_3: 90,
  preworkout_caffeine_mg: 200,
  additional_water_oz: 0,
  additional_milk_oz: 0,
  additional_fruit_servings: 0,
  additional_vegetable_servings: 0,
  additional_caffeine_mg: 0,
}

function useNutritionLog() {
  return useQuery({
    queryKey: ['nutrition_logs', today],
    queryFn: async () => {
      const { data, error } = await supabase.from('nutrition_logs').select('*').eq('log_date', today).maybeSingle()
      if (error) throw error
      return data as NutritionLog | null
    },
  })
}

function NumberStepper({
  value,
  onChange,
  step = 1,
  min = 0,
}: {
  value: number
  onChange: (n: number) => void
  step?: number
  min?: number
}) {
  return (
    <div className="flex items-center justify-center gap-1">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - step))}
        className="flex h-7 w-7 items-center justify-center rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
        aria-label="Decrease"
      >
        −
      </button>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-14 rounded bg-slate-800 px-1 py-1 text-center text-sm"
      />
      <button
        type="button"
        onClick={() => onChange(value + step)}
        className="flex h-7 w-7 items-center justify-center rounded bg-slate-800 text-slate-300 hover:bg-slate-700"
        aria-label="Increase"
      >
        +
      </button>
    </div>
  )
}

function Tile({
  icon,
  active,
  onClick,
  children,
}: {
  icon: string
  active?: boolean
  onClick?: () => void
  children?: React.ReactNode
}) {
  return (
    <div
      className={`flex flex-col items-center gap-2 rounded-lg border p-3 ${
        active ? 'border-emerald-600 bg-emerald-950/20' : 'border-slate-800'
      }`}
    >
      {onClick ? (
        <button type="button" onClick={onClick} className="text-4xl leading-none">
          {icon}
        </button>
      ) : (
        <span className="text-4xl leading-none">{icon}</span>
      )}
      {children}
    </div>
  )
}

function TileGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{children}</div>
}

export default function NutritionLogPage() {
  const queryClient = useQueryClient()
  const { data, isLoading } = useNutritionLog()
  const log = { ...DEFAULTS, ...(data ?? {}) }

  const updateMutation = useMutation({
    mutationFn: async (patch: Partial<NutritionLog>) => {
      const { error } = await supabase.from('nutrition_logs').upsert({ log_date: today, ...patch }, { onConflict: 'log_date' })
      if (error) throw error
    },
    onSuccess: (_data, patch) => {
      queryClient.setQueryData(['nutrition_logs', today], (old: NutritionLog | null | undefined) => ({
        ...(old ?? { log_date: today }),
        ...patch,
      }))
    },
  })

  const set = (patch: Partial<NutritionLog>) => updateMutation.mutate(patch)

  if (isLoading) return <PageShell title="Nutrition">Loading…</PageShell>

  const waterTotal = log.water_oz_1 + log.water_oz_2 + log.water_oz_3 + log.additional_water_oz
  const milkTotal = log.milk_oz_1 + log.milk_oz_2 + log.additional_milk_oz
  const fruitTotal = [log.fruit_1, log.fruit_2, log.fruit_3, log.fruit_4].filter((f) => f && f.trim()).length + log.additional_fruit_servings
  const vegTotal =
    [log.vegetable_1, log.vegetable_2, log.vegetable_3, log.vegetable_4].filter((v) => v && v.trim()).length +
    log.additional_vegetable_servings
  const caffeineTotal =
    log.coffee_caffeine_mg_1 + log.coffee_caffeine_mg_2 + log.coffee_caffeine_mg_3 + log.preworkout_caffeine_mg + log.additional_caffeine_mg

  return (
    <PageShell title="Nutrition" description={format(new Date(), 'EEEE, MMMM d, yyyy')}>
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <SummaryStat label="Water" value={`${waterTotal} / 60 oz`} />
        <SummaryStat label="Milk" value={`${milkTotal} / 40 oz`} />
        <SummaryStat label="Fruit" value={`${fruitTotal} / 4`} />
        <SummaryStat label="Veg" value={`${vegTotal} / 4`} />
        <SummaryStat label="Caffeine" value={`${caffeineTotal} / 300 mg`} warn={caffeineTotal > 300} />
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-medium text-slate-100">Water</h2>
        <TileGrid>
          {([1, 2, 3] as const).map((n) => {
            const key = `water_oz_${n}` as const
            return (
              <Tile key={n} icon="🚰">
                <NumberStepper value={log[key]} onChange={(v) => set({ [key]: v })} />
              </Tile>
            )
          })}
        </TileGrid>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-medium text-slate-100">Milk</h2>
        <TileGrid>
          {([1, 2] as const).map((n) => {
            const key = `milk_oz_${n}` as const
            return (
              <Tile key={n} icon="🥛">
                <NumberStepper value={log[key]} onChange={(v) => set({ [key]: v })} />
              </Tile>
            )
          })}
        </TileGrid>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-medium text-slate-100">Fruit</h2>
        <TileGrid>
          {([1, 2, 3, 4] as const).map((n) => {
            const key = `fruit_${n}` as const
            return (
              <Tile key={n} icon="🍎">
                <input
                  defaultValue={log[key] ?? ''}
                  placeholder="e.g. blueberries"
                  onBlur={(e) => e.target.value !== (log[key] ?? '') && set({ [key]: e.target.value || null })}
                  className="w-full rounded bg-slate-800 px-2 py-1 text-center text-sm"
                />
              </Tile>
            )
          })}
        </TileGrid>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-medium text-slate-100">Vegetables</h2>
        <TileGrid>
          {([1, 2, 3, 4] as const).map((n) => {
            const key = `vegetable_${n}` as const
            return (
              <Tile key={n} icon="🥬">
                <input
                  defaultValue={log[key] ?? ''}
                  placeholder="e.g. broccoli"
                  onBlur={(e) => e.target.value !== (log[key] ?? '') && set({ [key]: e.target.value || null })}
                  className="w-full rounded bg-slate-800 px-2 py-1 text-center text-sm"
                />
              </Tile>
            )
          })}
        </TileGrid>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-medium text-slate-100">Supplements</h2>
        <TileGrid>
          <Tile icon="💊" active={log.multivitamin_taken} onClick={() => set({ multivitamin_taken: !log.multivitamin_taken })}>
            <span className="text-xs text-slate-500">Multivitamin</span>
          </Tile>
          <Tile icon="🥄" active={log.creatine_taken} onClick={() => set({ creatine_taken: !log.creatine_taken })}>
            <span className="text-xs text-slate-500">Creatine (5g)</span>
          </Tile>
        </TileGrid>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-medium text-slate-100">Caffeine</h2>
        <TileGrid>
          {([1, 2, 3] as const).map((n) => {
            const key = `coffee_caffeine_mg_${n}` as const
            return (
              <Tile key={n} icon="☕">
                <NumberStepper value={log[key]} onChange={(v) => set({ [key]: v })} step={5} />
              </Tile>
            )
          })}
          <Tile icon="💪">
            <NumberStepper value={log.preworkout_caffeine_mg} onChange={(v) => set({ preworkout_caffeine_mg: v })} step={5} />
          </Tile>
        </TileGrid>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-medium text-slate-100">Additional</h2>
        <p className="mb-3 text-sm text-slate-500">Anything beyond the tiles above.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <AdditionalField
            icon="🚰"
            label="Extra water (oz)"
            value={log.additional_water_oz}
            onChange={(v) => set({ additional_water_oz: v })}
          />
          <AdditionalField
            icon="🥛"
            label="Extra milk (oz)"
            value={log.additional_milk_oz}
            onChange={(v) => set({ additional_milk_oz: v })}
          />
          <AdditionalField
            icon="🍎"
            label="Extra fruit (servings)"
            value={log.additional_fruit_servings}
            onChange={(v) => set({ additional_fruit_servings: v })}
          />
          <AdditionalField
            icon="🥬"
            label="Extra vegetables (servings)"
            value={log.additional_vegetable_servings}
            onChange={(v) => set({ additional_vegetable_servings: v })}
          />
          <AdditionalField
            icon="☕"
            label="Extra caffeine (mg)"
            value={log.additional_caffeine_mg}
            onChange={(v) => set({ additional_caffeine_mg: v })}
          />
        </div>
      </section>
    </PageShell>
  )
}

function SummaryStat({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={`rounded-lg border p-3 ${warn ? 'border-red-800 bg-red-950/20' : 'border-slate-800'}`}>
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 text-sm font-medium ${warn ? 'text-red-400' : 'text-slate-200'}`}>{value}</div>
    </div>
  )
}

function AdditionalField({
  icon,
  label,
  value,
  onChange,
}: {
  icon: string
  label: string
  value: number
  onChange: (n: number) => void
}) {
  return (
    <label className="flex items-center gap-3 rounded-lg border border-slate-800 p-3">
      <span className="text-2xl leading-none">{icon}</span>
      <span className="flex-1 text-sm text-slate-300">{label}</span>
      <input
        type="number"
        defaultValue={value}
        onBlur={(e) => {
          const v = Number(e.target.value) || 0
          if (v !== value) onChange(v)
        }}
        className="w-20 rounded bg-slate-800 px-2 py-1 text-center text-sm"
      />
    </label>
  )
}
