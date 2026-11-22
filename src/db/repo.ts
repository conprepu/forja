// Todas las escrituras a la base pasan por aquí. Los componentes solo leen con useLiveQuery.
import { db as defaultDb, newId, nowStamp, type AppDB } from './db'
import type { ColorName, ID, List, Task } from './types'
import { INBOX_ID } from './types'
import { nextOccurrence } from '../lib/recurrence'
import { todayISO } from '../lib/dates'

export type TaskDraft = Pick<Task, 'listId' | 'title' | 'notes' | 'dueDate' | 'dueTime' | 'priority' | 'recurrence'>

export const emptyDraft = (listId: ID = INBOX_ID, dueDate: string | null = null): TaskDraft => ({
  listId, title: '', notes: '', dueDate, dueTime: null, priority: 0, recurrence: null,
})

/** Normaliza un borrador: sin fecha no hay hora ni repetición; título recortado. */
function normalize(d: TaskDraft): TaskDraft {
  const title = d.title.trim()
  if (!d.dueDate) return { ...d, title, dueTime: null, recurrence: null }
  return { ...d, title }
}

export async function createTask(draft: TaskDraft, db: AppDB = defaultDb): Promise<ID> {
  const d = normalize(draft)
  const stamp = nowStamp()
  const task: Task = {
    ...d, id: newId(), completedAt: null, spawnedTaskId: null,
    order: Date.now(), createdAt: stamp, updatedAt: stamp,
  }
  await db.tasks.add(task)
  return task.id
}

export async function updateTask(id: ID, draft: TaskDraft, db: AppDB = defaultDb) {
  await db.tasks.update(id, { ...normalize(draft), updatedAt: nowStamp() })
}

export async function deleteTask(id: ID, db: AppDB = defaultDb) {
  await db.tasks.delete(id)
}

/**
 * Marca/desmarca una tarea. Al completar una tarea repetitiva crea la siguiente
 * ocurrencia; al desmarcarla, borra esa ocurrencia si sigue pendiente.
 */
export async function setTaskDone(id: ID, done: boolean, db: AppDB = defaultDb, today = todayISO()) {
  await db.transaction('rw', db.tasks, async () => {
    const task = await db.tasks.get(id)
    if (!task || !!task.completedAt === done) return
    const stamp = nowStamp()

    if (done) {
      let spawnedTaskId: ID | null = null
      if (task.recurrence && task.dueDate) {
        spawnedTaskId = newId()
        await db.tasks.add({
          ...task, id: spawnedTaskId, completedAt: null, spawnedTaskId: null,
          dueDate: nextOccurrence(task.recurrence, task.dueDate, today),
          createdAt: stamp, updatedAt: stamp,
        })
      }
      await db.tasks.update(id, { completedAt: stamp, spawnedTaskId, updatedAt: stamp })
    } else {
      if (task.spawnedTaskId) {
        const spawned = await db.tasks.get(task.spawnedTaskId)
        if (spawned && !spawned.completedAt) await db.tasks.delete(spawned.id)
      }
      await db.tasks.update(id, { completedAt: null, spawnedTaskId: null, updatedAt: stamp })
    }
  })
}

export async function createList(name: string, color: ColorName, db: AppDB = defaultDb): Promise<ID> {
  const list: List = { id: newId(), name: name.trim(), color, order: Date.now(), createdAt: nowStamp() }
  await db.lists.add(list)
  return list.id
}

export async function updateList(id: ID, patch: Partial<Pick<List, 'name' | 'color'>>, db: AppDB = defaultDb) {
  await db.lists.update(id, patch.name !== undefined ? { ...patch, name: patch.name.trim() } : patch)
}

/** Borra una lista y sus tareas. La bandeja de entrada no se puede borrar. */
export async function deleteList(id: ID, db: AppDB = defaultDb) {
  if (id === INBOX_ID) throw new Error('No se puede borrar la bandeja de entrada')
  await db.transaction('rw', db.lists, db.tasks, async () => {
    await db.tasks.where('listId').equals(id).delete()
    await db.lists.delete(id)
  })
}
