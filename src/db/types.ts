import type { ISODate } from '../lib/dates'

export type ID = string
/** Marca de tiempo ISO completa (Date.toISOString), para createdAt/updatedAt/completedAt. */
export type Timestamp = string

export type Priority = 0 | 1 | 2 | 3 // ninguna, baja, media, alta

export type List = {
  id: ID
  name: string
  color: ColorName
  order: number
  createdAt: Timestamp
}

export const COLORS = ['blue', 'red', 'orange', 'yellow', 'green', 'teal', 'indigo', 'purple', 'pink', 'gray'] as const
export type ColorName = (typeof COLORS)[number]

/** Repetición de tareas. La siguiente fecha se calcula a partir de dueDate. */
export type Recurrence =
  | { kind: 'daily' }
  | { kind: 'weekly'; days: number[] } // 0=dom … 6=sáb, no vacío
  | { kind: 'monthly'; day: number } // día ancla 1–31

export type Task = {
  id: ID
  listId: ID
  title: string
  notes: string
  dueDate: ISODate | null
  dueTime: string | null // 'HH:mm'
  priority: Priority
  recurrence: Recurrence | null
  completedAt: Timestamp | null
  /** Ocurrencia creada al completar esta tarea repetitiva (se borra si se desmarca). */
  spawnedTaskId: ID | null
  order: number
  createdAt: Timestamp
  updatedAt: Timestamp
}

/** Programación de hábitos. */
export type HabitSchedule =
  | { kind: 'daily' }
  | { kind: 'weekdays'; days: number[] } // días concretos, 0=dom … 6=sáb
  | { kind: 'weekly'; times: number } // X veces por semana (lunes–domingo), 1–7

export type Habit = {
  id: ID
  name: string
  color: ColorName
  schedule: HabitSchedule
  order: number
  archivedAt: Timestamp | null
  createdAt: Timestamp
}

export type HabitLog = {
  id: ID
  habitId: ID
  date: ISODate
}

export type Meta = { key: string; value: unknown }

export const INBOX_ID = 'inbox'
