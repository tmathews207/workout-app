import { useSearchParams } from 'react-router-dom'
import { format } from 'date-fns'

export const todayStr = () => format(new Date(), 'yyyy-MM-dd')

// Reads/writes the selected log date from the `?date=` query param, so
// navigating between related screens (e.g. sleep subjective -> objective)
// keeps the same date. Falls back to today when the param is absent, and
// omits the param entirely when it equals today to keep URLs clean.
export function useLogDate() {
  const [searchParams, setSearchParams] = useSearchParams()
  const today = todayStr()
  const date = searchParams.get('date') || today

  const setDate = (next: string) => {
    const params = new URLSearchParams(searchParams)
    if (next === today) {
      params.delete('date')
    } else {
      params.set('date', next)
    }
    setSearchParams(params, { replace: true })
  }

  return { date, setDate, today }
}
