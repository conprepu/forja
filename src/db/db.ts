import Dexie, { type EntityTable } from 'dexie'
import type { Habit, HabitLog, List, Meta, Task } from './types'
import { INBOX_ID } from './types'

/**
 * Esquema IndexedDB. REGLA: nunca modificar una versión ya publicada.
 * Para cambios, agregar `this.version(N+1).stores(...).upgrade(...)` y subir
 * SCHEMA_VERSION (también lo usa el formato de respaldo).
 */
export const SCHEMA_VERSION = 1

export class AppDB extends Dexie {
  lists!: EntityTable<List, 'id'>
  tasks!: EntityTable<Task, 'id'>
  habits!: EntityTable<Habit, 'id'>
  habitLogs!: EntityTable<HabitLog, 'id'>
  meta!: EntityTable<Meta, 'key'>

  constructor(name = 'ticktick-private') {
    super(name)
    this.version(1).stores({
      lists: 'id, order',
      tasks: 'id, listId, dueDate, completedAt',
      habits: 'id, order',
      habitLogs: 'id, &[habitId+date], habitId, date',
      meta: 'key',
    })
    this.on('populate', (tx) => {
      tx.table('lists').add(inboxList())
    })
  }
}

export function inboxList(): List {
  return { id: INBOX_ID, name: 'Bandeja de entrada', color: 'blue', order: 0, createdAt: new Date().toISOString() }
}

export const db = new AppDB()

export const newId = () => crypto.randomUUID()
export const nowStamp = () => new Date().toISOString()
