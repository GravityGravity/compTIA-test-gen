export const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']

/** 01:30:00 */
export function hms(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  return [Math.floor(s / 3600), Math.floor((s % 3600) / 60), s % 60]
    .map((n) => String(n).padStart(2, '0'))
    .join(':')
}

/** mm:ss, with a minus sign when the suggested time is over. */
export function paceClock(seconds: number): string {
  const a = Math.abs(seconds)
  return (
    (seconds < 0 ? '-' : '') + [Math.floor(a / 60), a % 60].map((n) => String(n).padStart(2, '0')).join(':')
  )
}

/** 27 Oct 2026, 14:05 */
export function dateTime(iso: string): string {
  const d = new Date(iso)
  const date = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })
  return `${date}, ${time}`
}

export const sameAnswer = (a: readonly number[] | null, b: readonly number[] | null) =>
  !!a && !!b && a.length === b.length && a.every((v, j) => v === b[j])
