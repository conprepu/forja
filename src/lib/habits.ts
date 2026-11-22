import type { HabitSchedule } from '../db/types'
import { addDays, type ISODate, startOfWeek, weekday, WEEK_ORDER, WEEKDAY_NAMES } from './dates'

export type Streak = { current: number; best: number; unit: 'day' | 'week' }

/** ¿Toca el hábito ese día? En "X veces por semana" cualquier día sirve. */
export function isScheduled(schedule: HabitSchedule, date: ISODate): boolean {
  switch (schedule.kind) {
    case 'daily':
    case 'weekly':
      return true
    case 'weekdays':
      return schedule.days.includes(weekday(date))
  }
}

/** Veces completado en la semana (lunes–domingo) que contiene `date`. */
export function countInWeek(done: ReadonlySet<ISODate>, date: ISODate): number {
  const start = startOfWeek(date)
  let n = 0
  for (let i = 0; i < 7; i++) if (done.has(addDays(start, i))) n++
  return n
}

function earliest(done: ReadonlySet<ISODate>): ISODate | null {
  let min: ISODate | null = null
  for (const d of done) if (min === null || d < min) min = d
  return min
}

/**
 * Rachas.
 * - Diario / días concretos: días programados consecutivos cumplidos. Los días no
 *   programados ni suman ni rompen. Hoy sin marcar no rompe (el día sigue abierto).
 * - X veces por semana: semanas consecutivas cumplidas. La semana en curso sin
 *   cumplir aún no rompe.
 * Solo cuentan fechas <= hoy.
 */
export function computeStreak(schedule: HabitSchedule, done: ReadonlySet<ISODate>, today: ISODate): Streak {
  const past = new Set([...done].filter((d) => d <= today))
  const first = earliest(past)
  if (schedule.kind === 'weekly') return weeklyStreak(schedule.times, past, first, today)

  const unit = 'day'
  if (!first) return { current: 0, best: 0, unit }

  // Racha actual: hacia atrás desde hoy.
  let current = 0
  for (let d = today; d >= first; d = addDays(d, -1)) {
    if (!isScheduled(schedule, d)) continue
    if (past.has(d)) current++
    else if (d !== today) break
  }

  // Mejor racha: hacia adelante desde el primer registro.
  let best = 0
  let run = 0
  for (let d = first; d <= today; d = addDays(d, 1)) {
    if (!isScheduled(schedule, d)) continue
    if (past.has(d)) best = Math.max(best, ++run)
    else if (d !== today) run = 0
  }
  return { current, best: Math.max(best, current), unit }
}

function weeklyStreak(times: number, done: ReadonlySet<ISODate>, first: ISODate | null, today: ISODate): Streak {
  const unit = 'week'
  if (!first) return { current: 0, best: 0, unit }
  const met = (weekStart: ISODate) => countInWeek(done, weekStart) >= times
  const thisWeek = startOfWeek(today)
  const firstWeek = startOfWeek(first)

  let current = 0
  for (let w = thisWeek; w >= firstWeek; w = addDays(w, -7)) {
    if (met(w)) current++
    else if (w !== thisWeek) break
  }

  let best = 0
  let run = 0
  for (let w = firstWeek; w <= thisWeek; w = addDays(w, 7)) {
    if (met(w)) best = Math.max(best, ++run)
    else if (w !== thisWeek) run = 0
  }
  return { current, best: Math.max(best, current), unit }
}

/** ¿Mostrar el hábito en "Hoy"? En semanal: mientras falte cumplir la semana, o si se marcó hoy. */
export function isDueToday(schedule: HabitSchedule, done: ReadonlySet<ISODate>, today: ISODate): boolean {
  if (schedule.kind === 'weekly') return done.has(today) || countInWeek(done, today) < schedule.times
  return isScheduled(schedule, today)
}

export function describeSchedule(schedule: HabitSchedule): string {
  switch (schedule.kind) {
    case 'daily':
      return 'Cada día'
    case 'weekdays': {
      const days = WEEK_ORDER.filter((d) => schedule.days.includes(d))
      if (days.length === 7) return 'Cada día'
      if (days.length === 5 && !days.includes(0) && !days.includes(6)) return 'Entre semana'
      return days.map((d) => WEEKDAY_NAMES[d]!.slice(0, 3)).join(', ')
    }
    case 'weekly':
      return schedule.times === 1 ? '1 vez por semana' : `${schedule.times} veces por semana`
  }
}

export function formatStreak(s: Pick<Streak, 'unit'>, n: number): string {
  if (s.unit === 'week') return n === 1 ? '1 semana' : `${n} semanas`
  return n === 1 ? '1 día' : `${n} días`
}
