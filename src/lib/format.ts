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
