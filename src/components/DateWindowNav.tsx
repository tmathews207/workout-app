import { format } from 'date-fns'

export function DateWindowNav({
  startDate,
  endDate,
  isCurrent,
  onPrev,
  onNext,
}: {
  startDate: Date
  endDate: Date
  isCurrent: boolean
  onPrev: () => void
  onNext: () => void
}) {
  return (
    <div className="mb-6 flex items-center justify-between gap-2">
      <button type="button" onClick={onPrev} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm text-slate-200">
        ← Prev
      </button>
      <span className="text-sm text-slate-300">
        {format(startDate, 'MMM d')} – {format(endDate, 'MMM d, yyyy')}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={isCurrent}
        className="rounded-md bg-slate-800 px-3 py-1.5 text-sm text-slate-200 disabled:opacity-40"
      >
        Next →
      </button>
    </div>
  )
}
