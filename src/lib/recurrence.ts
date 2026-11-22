import type { Recurrence } from '../db/types'
import { addDays, addMonthsAnchored, type ISODate, weekday, WEEK_ORDER, WEEKDAY_NAMES } from './dates'

/** Siguiente fecha estrictamente posterior a `from` según la regla. */
export function stepOccurrence(rule: Recurrence, from: ISODate): ISODate {
  switch (rule.kind) {
    case 'daily':
      return addDays(from, 1)
    case 'weekly': {
      if (rule.days.length === 0) return addDays(from, 7)
      for (let i = 1; i <= 7; i++) {
        const d = addDays(from, i)
        if (rule.days.includes(weekday(d))) return d
      }
      return addDays(from, 7) // inalcanzable
    }
    case 'monthly':
      return addMonthsAnchored(from, 1, rule.day)
  }
}

/**
 * Fecha de la siguiente ocurrencia al completar una tarea repetitiva.
 * Es la primera ocurrencia posterior a `dueDate` que no quede en el pasado:
 * si la tarea estaba atrasada, no se generan ocurrencias ya vencidas.
 */
export function nextOccurrence(rule: Recurrence, dueDate: ISODate, today: ISODate): ISODate {
  let d = stepOccurrence(rule, dueDate)
  for (let guard = 0; d < today && guard < 1000; guard++) d = stepOccurrence(rule, d)
  return d
}

export function describeRecurrence(rule: Recurrence): string {
  switch (rule.kind) {
    case 'daily':
      return 'Cada día'
    case 'weekly': {
      const days = WEEK_ORDER.filter((d) => rule.days.includes(d))
      if (days.length === 7) return 'Cada día'
      if (days.length === 5 && !days.includes(0) && !days.includes(6)) return 'Entre semana'
      return 'Cada ' + days.map((d) => WEEKDAY_NAMES[d]).join(', ')
    }
    case 'monthly':
      return `Cada mes, el día ${rule.day}`
  }
}
