/** 75 → "1:15", 3725 → "1:02:05". */
export function fmtT(sec: number): string {
  const s = Math.max(0, Math.round(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const x = s % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h ? `${h}:${pad(m)}:${pad(x)}` : `${m}:${pad(x)}`
}

export const fmtN = (n: number): string => Math.round(n).toLocaleString('es-MX')
