import type { Task } from '../db/types'

/**
 * Orden de tareas pendientes: prioridad (alta primero), luego fecha
 * (sin fecha al final), hora (sin hora al final) y orden de creación.
 */
export function compareTasks(a: Task, b: Task): number {
  if (a.priority !== b.priority) return b.priority - a.priority
  if (a.dueDate !== b.dueDate) {
    if (!a.dueDate) return 1
    if (!b.dueDate) return -1
    return a.dueDate < b.dueDate ? -1 : 1
  }
  if (a.dueTime !== b.dueTime) {
    if (!a.dueTime) return 1
    if (!b.dueTime) return -1
    return a.dueTime < b.dueTime ? -1 : 1
  }
  return a.order - b.order
}

export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort(compareTasks)
}

/** Completadas: las más recientes primero. */
export function sortCompleted(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
}
