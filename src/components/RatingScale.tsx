import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { RatingScaleKey } from '../types/database'

function useRatingDescriptions(scaleKey: RatingScaleKey) {
  return useQuery({
    queryKey: ['rating_descriptions', scaleKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('rating_descriptions')
        .select('rating, description')
        .eq('scale_key', scaleKey)
        .order('rating', { ascending: false })
      if (error) throw error
      return data as { rating: number; description: string }[]
    },
    staleTime: Infinity, // admin-editable but rarely changes; refetch on reload is enough
  })
}

export function RatingScale({
  max,
  value,
  onChange,
  label,
  scaleKey,
}: {
  max: 5 | 10
  value: number | undefined
  onChange: (n: number) => void
  label: string
  scaleKey: RatingScaleKey
}) {
  const { data: descriptions } = useRatingDescriptions(scaleKey)
  const descriptionFor = (n: number) => descriptions?.find((d) => d.rating === n)?.description

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="text-sm font-medium text-slate-200">{label}</span>
        {value !== undefined && descriptionFor(value) && (
          <span className="truncate text-sm text-sky-400">{descriptionFor(value)}</span>
        )}
      </div>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
            title={descriptionFor(n)}
            onClick={() => onChange(n)}
            className={`h-9 w-9 rounded-md text-sm font-medium ${
              value === n
                ? 'bg-sky-500 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      {descriptions && descriptions.length > 0 && (
        <ul className="space-y-0.5 text-xs">
          {descriptions.map((d) => (
            <li
              key={d.rating}
              className={`flex gap-2 rounded px-1.5 py-0.5 ${
                value === d.rating ? 'bg-sky-500/10 text-sky-300' : 'text-slate-500'
              }`}
            >
              <span className="w-3.5 shrink-0 text-right">{d.rating}</span>
              <span>{d.description}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
