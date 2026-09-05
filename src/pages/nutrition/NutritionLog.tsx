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
  water_1_taken: false,
  water_2_taken: false,
  water_3_taken: false,
  milk_oz_1: 20,
  milk_oz_2: 20,
  milk_1_taken: false,
  milk_2_taken: false,
  fruit_1: null,
  fruit_2: null,
  fruit_3: null,
  fruit_4: null,
  fruit_1_taken: false,
  fruit_2_taken: false,
  fruit_3_taken: false,
  fruit_4_taken: false,
  vegetable_1: null,
  vegetable_2: null,
  vegetable_3: null,
  vegetable_4: null,
  vegetable_1_taken: false,
  vegetable_2_taken: false,
  vegetable_3_taken: false,
  vegetable_4_taken: false,
  multivitamin_taken: false,
  creatine_taken: false,
  coffee_caffeine_mg_1: 90,
  coffee_caffeine_mg_2: 90,
  coffee_caffeine_mg_3: 90,
  coffee_1_taken: false,
  coffee_2_taken: false,
  coffee_3_taken: false,
  preworkout_caffeine_mg: 200,
  preworkout_taken: false,
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

  const waterTotal =
    (log.water_1_taken ? log.water_oz_1 : 0) +
    (log.water_2_taken ? log.water_oz_2 : 0) +
    (log.water_3_taken ? log.water_oz_3 : 0) +
    log.additional_water_oz
  const milkTotal = (log.milk_1_taken ? log.milk_oz_1 : 0) + (log.milk_2_taken ? log.milk_oz_2 : 0) + log.additional_milk_oz
  const fruitTotal =
    [log.fruit_1_taken, log.fruit_2_taken, log.fruit_3_taken, log.fruit_4_taken].filter(Boolean).length + log.additional_fruit_servings
  const vegTotal =
    [log.vegetable_1_taken, log.vegetable_2_taken, log.vegetable_3_taken, log.vegetable_4_taken].filter(Boolean).length +
    log.additional_vegetable_servings
  const caffeineTotal =
    (log.coffee_1_taken ? log.coffee_caffeine_mg_1 : 0) +
    (log.coffee_2_taken ? log.coffee_caffeine_mg_2 : 0) +
    (log.coffee_3_taken ? log.coffee_caffeine_mg_3 : 0) +
    (log.preworkout_taken ? log.preworkout_caffeine_mg : 0) +
    log.additional_caffeine_mg

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
            const valueKey = `water_oz_${n}` as const
            const takenKey = `water_${n}_taken` as const
            return (
              <Tile key={n} icon="🚰" active={log[takenKey]} onClick={() => set({ [takenKey]: !log[takenKey] })}>
                <NumberStepper value={log[valueKey]} onChange={(v) => set({ [valueKey]: v })} />
              </Tile>
            )
          })}
        </TileGrid>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-medium text-slate-100">Milk</h2>
        <TileGrid>
          {([1, 2] as const).map((n) => {
            const valueKey = `milk_oz_${n}` as const
            const takenKey = `milk_${n}_taken` as const
            return (
              <Tile key={n} icon="🥛" active={log[takenKey]} onClick={() => set({ [takenKey]: !log[takenKey] })}>
                <NumberStepper value={log[valueKey]} onChange={(v) => set({ [valueKey]: v })} />
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
            const takenKey = `fruit_${n}_taken` as const
            return (
              <Tile key={n} icon="🍎" active={log[takenKey]} onClick={() => set({ [takenKey]: !log[takenKey] })}>
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
            const takenKey = `vegetable_${n}_taken` as const
            return (
              <Tile key={n} icon="🥬" active={log[takenKey]} onClick={() => set({ [takenKey]: !log[takenKey] })}>
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
            const valueKey = `coffee_caffeine_mg_${n}` as const
            const takenKey = `coffee_${n}_taken` as const
            return (
              <Tile key={n} icon="☕" active={log[takenKey]} onClick={() => set({ [takenKey]: !log[takenKey] })}>
                <NumberStepper value={log[valueKey]} onChange={(v) => set({ [valueKey]: v })} step={5} />
              </Tile>
            )
          })}
          <Tile icon="💪" active={log.preworkout_taken} onClick={() => set({ preworkout_taken: !log.preworkout_taken })}>
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
