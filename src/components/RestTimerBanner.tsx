import type { RestTimer } from '../lib/useRestTimer'
import { formatMMSS } from '../lib/format'

export function RestTimerBanner({ timer }: { timer: RestTimer }) {
  if (!timer.visible) return null

  const done = timer.remainingSeconds <= 0
  const pct = timer.totalSeconds > 0 ? (timer.remainingSeconds / timer.totalSeconds) * 100 : 0

  return (
    <div
      className={`sticky z-20 mb-4 overflow-hidden rounded-md border px-4 py-3 shadow-lg backdrop-blur ${
        done ? 'border-emerald-700 bg-emerald-950/90' : 'border-sky-800 bg-slate-900/90'
      }`}
      style={{ top: 'var(--nav-height, 3.5rem)' }}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-400">{done ? 'Rest complete' : 'Resting'}</div>
          <div className={`text-2xl font-semibold tabular-nums ${done ? 'text-emerald-400' : 'text-slate-100'}`}>
            {formatMMSS(timer.remainingSeconds)}
          </div>
        </div>
        <div className="flex gap-2">
          {!done && (
            <button
              type="button"
              onClick={timer.running ? timer.pause : timer.resume}
              className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200"
            >
              {timer.running ? 'Pause' : 'Resume'}
            </button>
          )}
          <button type="button" onClick={timer.reset} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-slate-200">
            Reset
          </button>
          <button type="button" onClick={timer.cancel} className="rounded-md bg-slate-800 px-3 py-1.5 text-sm font-medium text-red-400">
            Cancel
          </button>
        </div>
      </div>
      <div className="mt-2 h-1 w-full rounded-full bg-slate-800">
        <div
          className={`h-1 rounded-full transition-[width] duration-300 ${done ? 'bg-emerald-500' : 'bg-sky-500'}`}
          style={{ width: `${done ? 100 : pct}%` }}
        />
      </div>
    </div>
  )
}
