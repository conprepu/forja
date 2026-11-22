// Fechas locales como 'YYYY-MM-DD' (nunca UTC: un entreno a las 11 pm cuenta para ese día).

export const localDate = (d: Date | number = new Date()): string => new Date(d).toLocaleDateString('sv-SE')
export const todayStr = (): string => localDate()

const noon = (date: string) => new Date(`${date}T12:00:00`)

export function addDays(date: string, n: number): string {
  const d = noon(date)
  d.setDate(d.getDate() + n)
  return localDate(d)
}

/** Lunes de la semana de `date`. */
export function startOfWeek(date: string): string {
  return addDays(date, -((noon(date).getDay() + 6) % 7))
}

export const monthKey = (date: string): string => date.slice(0, 7)

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number) as [number, number]
  const d = new Date(y, m - 1 + n, 1, 12)
  return localDate(d).slice(0, 7)
}

/** Semanas (lunes a domingo) de un mes; los huecos son null. */
export function monthGrid(month: string): (string | null)[][] {
  const [y, m] = month.split('-').map(Number) as [number, number]
  const days = new Date(y, m, 0).getDate()
  const lead = (new Date(y, m - 1, 1, 12).getDay() + 6) % 7
  const cells: (string | null)[] = Array(lead).fill(null)
  for (let d = 1; d <= days; d++) cells.push(`${month}-${String(d).padStart(2, '0')}`)
  while (cells.length % 7) cells.push(null)
  const weeks: (string | null)[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export const formatDay = (date: string): string =>
  cap(noon(date).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' }))

export const formatShort = (date: string): string =>
  noon(date).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })

export const monthLabel = (month: string): string =>
  cap(noon(`${month}-01`).toLocaleDateString('es-MX', { month: 'long', year: 'numeric' }))
