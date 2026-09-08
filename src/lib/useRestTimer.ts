import { useCallback, useEffect, useRef, useState } from 'react'

// Counts down from a wall-clock end time (recomputed each tick from
// Date.now()) rather than decrementing a counter, so it stays correct even
// if the tab is backgrounded/throttled and catches up instead of drifting.
export function useRestTimer() {
  const [totalSeconds, setTotalSeconds] = useState(0)
  const [remainingSeconds, setRemainingSeconds] = useState(0)
  const [running, setRunning] = useState(false)
  const [visible, setVisible] = useState(false)
  const endTimeRef = useRef<number | null>(null)

  useEffect(() => {
    if (!running) return
    const tick = () => {
      if (endTimeRef.current == null) return
      const remaining = Math.max(0, Math.round((endTimeRef.current - Date.now()) / 1000))
      setRemainingSeconds(remaining)
      if (remaining <= 0) setRunning(false)
    }
    tick()
    const id = setInterval(tick, 250)
    return () => clearInterval(id)
  }, [running])

  const start = useCallback((seconds: number) => {
    if (!seconds || seconds <= 0) return
    setTotalSeconds(seconds)
    setRemainingSeconds(seconds)
    endTimeRef.current = Date.now() + seconds * 1000
    setRunning(true)
    setVisible(true)
  }, [])

  const pause = useCallback(() => setRunning(false), [])

  const resume = useCallback(() => {
    setRemainingSeconds((remaining) => {
      if (remaining > 0) {
        endTimeRef.current = Date.now() + remaining * 1000
        setRunning(true)
      }
      return remaining
    })
  }, [])

  const reset = useCallback(() => {
    setTotalSeconds((total) => {
      setRemainingSeconds(total)
      endTimeRef.current = Date.now() + total * 1000
      setRunning(true)
      return total
    })
  }, [])

  const cancel = useCallback(() => {
    setRunning(false)
    setVisible(false)
    endTimeRef.current = null
  }, [])

  return { totalSeconds, remainingSeconds, running, visible, start, pause, resume, reset, cancel }
}

export type RestTimer = ReturnType<typeof useRestTimer>
