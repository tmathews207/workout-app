// A "first:second" duration entered as two separate number inputs (e.g.
// mm:ss for rest/pace/duration, hh:mm for sleep length) instead of one free
// text field — free text has no type/inputMode that gets a numeric keypad
// on iOS while still allowing a ":" character, so two number inputs sidestep
// that rather than fight it. The combined value is still a "first:second"
// string, same as before, so callers don't need to change.
export function SplitTimeField({
  label,
  value,
  onChange,
  firstLabel,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  firstLabel: string
}) {
  const [first, second] = value.split(':')

  const emit = (newFirst: string, newSecond: string) => {
    if (!newFirst && !newSecond) {
      onChange('')
      return
    }
    onChange(`${newFirst || '0'}:${(newSecond || '0').padStart(2, '0')}`)
  }

  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-slate-200">{label}</span>
      <div className="flex items-center gap-1">
        <input
          type="number"
          inputMode="numeric"
          min={0}
          placeholder={firstLabel}
          value={first ?? ''}
          onChange={(e) => emit(e.target.value, second ?? '')}
          className="w-16 rounded-md bg-slate-800 px-2 py-2 text-center"
        />
        <span className="text-slate-400">:</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={59}
          placeholder="00"
          value={second ?? ''}
          onChange={(e) => emit(first ?? '', e.target.value)}
          className="w-16 rounded-md bg-slate-800 px-2 py-2 text-center"
        />
      </div>
    </label>
  )
}
