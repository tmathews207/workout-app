export function RatingScale({
  max,
  value,
  onChange,
  label,
}: {
  max: 5 | 10
  value: number | undefined
  onChange: (n: number) => void
  label: string
}) {
  return (
    <div>
      <div className="mb-2 text-sm font-medium text-slate-200">{label}</div>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
          <button
            key={n}
            type="button"
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
    </div>
  )
}
