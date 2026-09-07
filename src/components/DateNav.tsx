import { addDays, format, parseISO } from 'date-fns'

export function DateNav({
  date,
  today,
  onChange,
}: {
  date: string
  today: string
  onChange: (date: string) => void
}) {
  const shift = (deltaDays: number) => onChange(format(addDays(parseISO(date), deltaDays), 'yyyy-MM-dd'))
  const isToday = date === today

  return (
    <div className="mb-6 flex items-center justify-between gap-2 rounded-md border border-slate-800 bg-slate-900/50 px-2 py-1.5">
      <button
        type="button"
        onClick={() => shift(-1)}
        aria-label="Previous day"
        className="rounded px-2 py-1 text-slate-300 hover:bg-slate-800"
      >
        ←
      </button>
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={date}
          max={today}
          onChange={(e) => e.target.value && onChange(e.target.value)}
          className="rounded-md bg-slate-800 px-2 py-1 text-sm"
        />
        {!isToday && (
          <button type="button" onClick={() => onChange(today)} className="text-xs text-sky-400 hover:underline">
            Today
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => shift(1)}
        disabled={isToday}
        aria-label="Next day"
        className="rounded px-2 py-1 text-slate-300 hover:bg-slate-800 disabled:opacity-30"
      >
        →
      </button>
    </div>
  )
}
