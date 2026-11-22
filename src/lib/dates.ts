// Fechas de calendario como strings locales 'YYYY-MM-DD' (ISODate).
// Nunca usar Date.toISOString() para fechas de calendario: convierte a UTC y cambia el día.
export type ISODate = string

const pad = (n: number) => String(n).padStart(2, '0')

export function toISODate(d: Date): ISODate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function parseISODate(s: ISODate): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y!, m! - 1, d!)
}

export function todayISO(now: Date = new Date()): ISODate {
  return toISODate(now)
}

export function addDays(s: ISODate, n: number): ISODate {
  const d = parseISODate(s)
  d.setDate(d.getDate() + n)
  return toISODate(d)
}

export function daysInMonth(year: number, month0: number): number {
  return new Date(year, month0 + 1, 0).getDate()
}

/** Suma meses conservando el día ancla (p. ej. 31) y recortando al último día del mes. */
export function addMonthsAnchored(s: ISODate, n: number, anchorDay: number): ISODate {
  const d = parseISODate(s)
  const target = new Date(d.getFullYear(), d.getMonth() + n, 1)
  const day = Math.min(anchorDay, daysInMonth(target.getFullYear(), target.getMonth()))
  return toISODate(new Date(target.getFullYear(), target.getMonth(), day))
}

/** 0 = domingo … 6 = sábado (como Date.getDay). */
export function weekday(s: ISODate): number {
  return parseISODate(s).getDay()
}

/** Lunes de la semana que contiene `s`. Las semanas empiezan en lunes. */
export function startOfWeek(s: ISODate): ISODate {
  return addDays(s, -((weekday(s) + 6) % 7))
}

/** Días de `a` a `b` (b - a). Usa mediodía para esquivar los cambios de horario. */
export function diffDays(a: ISODate, b: ISODate): number {
  const da = parseISODate(a)
  da.setHours(12)
  const db = parseISODate(b)
  db.setHours(12)
  return Math.round((db.getTime() - da.getTime()) / 86_400_000)
}

export const WEEKDAY_SHORT = ['D', 'L', 'M', 'X', 'J', 'V', 'S'] as const
export const WEEKDAY_NAMES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'] as const
/** Orden de presentación: lunes primero. */
export const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0] as const

const fmtShort = new Intl.DateTimeFormat('es', { weekday: 'short', day: 'numeric', month: 'short' })

export function formatRelative(s: ISODate, today: ISODate): string {
  const diff = diffDays(today, s)
  if (diff === 0) return 'Hoy'
  if (diff === 1) return 'Mañana'
  if (diff === -1) return 'Ayer'
  return fmtShort.format(parseISODate(s)).replace(/\./g, '')
}
