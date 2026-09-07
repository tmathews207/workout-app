import { useState } from 'react'
import { addDays, format, subDays } from 'date-fns'

export const WINDOW_DAYS = 14

// A scrollable rolling window of `days` days ending at `anchor`, steppable
// backward/forward a full window at a time — same idea as ModalityTracker's
// week nav, but for the rolling 14-day trend charts.
export function useDateWindow(days: number = WINDOW_DAYS) {
  const [anchor, setAnchor] = useState(new Date())
  const start = subDays(anchor, days - 1)
  const isCurrent = format(anchor, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')

  return {
    startDate: start,
    endDate: anchor,
    startStr: format(start, 'yyyy-MM-dd'),
    endStr: format(anchor, 'yyyy-MM-dd'),
    isCurrent,
    prev: () => setAnchor((d) => subDays(d, days)),
    next: () => setAnchor((d) => (isCurrent ? d : addDays(d, days))),
  }
}
