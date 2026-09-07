import type { ReadinessLog } from '../types/database'

type ReadinessFields = Pick<ReadinessLog, 'energy_level' | 'mental_focus' | 'stress_level' | 'work_life_balance'>

// Average of whichever of the four ratings are present; null if none are.
export function readinessAverage(log: ReadinessFields | null | undefined): number | null {
  if (!log) return null
  const values = [log.energy_level, log.mental_focus, log.stress_level, log.work_life_balance].filter(
    (v): v is number => v != null,
  )
  if (values.length === 0) return null
  return values.reduce((a, b) => a + b, 0) / values.length
}
