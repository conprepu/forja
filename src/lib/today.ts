import type { Task } from '../db/types'
import type { ISODate } from './dates'
import { sortCompleted, sortTasks } from './taskSort'

/** Reparte tareas con fecha en las secciones de la vista Hoy. */
export function selectToday(tasks: Task[], today: ISODate) {
  const overdue: Task[] = []
  const dueToday: Task[] = []
  const doneToday: Task[] = []
  for (const t of tasks) {
    if (!t.dueDate || t.dueDate > today) continue
    if (t.completedAt) {
      if (t.dueDate === today) doneToday.push(t)
    } else if (t.dueDate < today) overdue.push(t)
    else dueToday.push(t)
  }
  return { overdue: sortTasks(overdue), dueToday: sortTasks(dueToday), doneToday: sortCompleted(doneToday) }
}
