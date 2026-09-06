// mm:ss <-> seconds, used for duration/rest fields stored as seconds in jsonb.
export function parseMMSS(input: string): number | undefined {
  const trimmed = input.trim()
  if (!trimmed) return undefined
  const [mm, ss] = trimmed.split(':')
  const minutes = Number(mm)
  const seconds = Number(ss ?? 0)
  if (Number.isNaN(minutes) || Number.isNaN(seconds)) return undefined
  return minutes * 60 + seconds
}

export function formatMMSS(totalSeconds: number | undefined | null): string {
  if (totalSeconds == null) return ''
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.round(totalSeconds % 60)
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

// hh:mm <-> decimal hours, used for total sleep duration (stored as hours).
export function parseHHMM(input: string): number | undefined {
  const trimmed = input.trim()
  if (!trimmed) return undefined
  const [hh, mm] = trimmed.split(':')
  const hours = Number(hh)
  const minutes = Number(mm ?? 0)
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return undefined
  return hours + minutes / 60
}

export function formatHHMM(totalHours: number | undefined | null): string {
  if (totalHours == null) return ''
  const hours = Math.floor(totalHours)
  const minutes = Math.round((totalHours - hours) * 60)
  return `${hours}:${String(minutes).padStart(2, '0')}`
}
