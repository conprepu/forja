import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AppDB } from './db'
import { createList, createTask, deleteList, emptyDraft, setTaskDone } from './repo'
import { INBOX_ID } from './types'

let db: AppDB
let n = 0
beforeEach(() => {
  db = new AppDB(`repo-test-${n++}`)
})
afterEach(async () => {
  await db.delete()
})

describe('tareas repetitivas', () => {
  it('al completar crea la siguiente ocurrencia', async () => {
    const id = await createTask({ ...emptyDraft(), title: 'Regar', dueDate: '2026-11-22', recurrence: { kind: 'daily' } }, db)
    await setTaskDone(id, true, db, '2026-11-22')
    const tasks = await db.tasks.toArray()
    expect(tasks).toHaveLength(2)
    const next = tasks.find((t) => t.id !== id)!
    expect(next).toMatchObject({ title: 'Regar', dueDate: '2026-11-23', completedAt: null })
  })

  it('al desmarcar borra la ocurrencia creada', async () => {
    const id = await createTask({ ...emptyDraft(), title: 'Regar', dueDate: '2026-11-22', recurrence: { kind: 'daily' } }, db)
    await setTaskDone(id, true, db, '2026-11-22')
    await setTaskDone(id, false, db, '2026-11-22')
    const tasks = await db.tasks.toArray()
    expect(tasks).toHaveLength(1)
    expect(tasks[0]!.completedAt).toBeNull()
  })

  it('completar dos veces no duplica', async () => {
    const id = await createTask({ ...emptyDraft(), title: 'X', dueDate: '2026-11-22', recurrence: { kind: 'daily' } }, db)
    await setTaskDone(id, true, db, '2026-11-22')
    await setTaskDone(id, true, db, '2026-11-22')
    expect(await db.tasks.count()).toBe(2)
  })

  it('sin fecha se descarta la repetición', async () => {
    const id = await createTask({ ...emptyDraft(), title: 'X', recurrence: { kind: 'daily' } }, db)
    expect((await db.tasks.get(id))!.recurrence).toBeNull()
  })
})

describe('listas', () => {
  it('borrar una lista borra sus tareas', async () => {
    const listId = await createList('Casa', 'green', db)
    await createTask({ ...emptyDraft(listId), title: 'Barrer' }, db)
    await createTask({ ...emptyDraft(), title: 'Otra' }, db)
    await deleteList(listId, db)
    expect(await db.tasks.count()).toBe(1)
  })
  it('la bandeja no se puede borrar', async () => {
    await expect(deleteList(INBOX_ID, db)).rejects.toThrow()
  })
})
