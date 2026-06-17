/** `"HH:MM"` ↔ minutes past midnight — shared by the M12c clock editors / scrubber. */

export function minutesToHHMM(m: number | undefined): string {
  if (m === undefined || Number.isNaN(m)) return ''
  const x = ((Math.round(m) % 1440) + 1440) % 1440
  const h = Math.floor(x / 60)
  const min = x % 60
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}

export function hhmmToMinutes(s: string): number | undefined {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim())
  if (!m) return undefined
  return (Number(m[1]) % 24) * 60 + (Number(m[2]) % 60)
}
