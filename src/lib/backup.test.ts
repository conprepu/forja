import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { AppDB } from '../db/db'
import { createHabit, createList, createTask, emptyDraft, toggleHabit } from '../db/repo'
import { BackupError, createBackup, hasUndoImport, importBackup, needsBackupReminder, parseBackup, undoImport } from './backup'

let db: AppDB
let n = 0
beforeEach(() => {
  db = new AppDB(`backup-test-${n++}`)
})
afterEach(async () => {
  await db.delete()
})

async function seed() {
  const listId = await createList('Casa', 'green', db)
  await createTask({ ...emptyDraft(listId), title: 'Barrer', dueDate: '2026-11-22', recurrence: { kind: 'weekly', days: [1, 4] } }, db)
  const h = await createHabit({ name: 'Leer', color: 'orange', schedule: { kind: 'weekly', times: 3 } }, db)
  await toggleHabit(h, '2026-11-22', db)
}

describe('respaldo', () => {
  it('exportar → JSON → importar conserva todo', async () => {
    await seed()
    const json = JSON.stringify(await createBackup(db))
    const other = new AppDB(`backup-target-${n++}`)
    await importBackup(parseBackup(JSON.parse(json)), other)
    const a = (await createBackup(db)).data
    const b = (await createBackup(other)).data
    expect(b).toEqual(a)
    await other.delete()
  })

  it('importar reemplaza los datos y se puede deshacer', async () => {
    await seed()
    const before = (await createBackup(db)).data
    const empty = parseBackup({ app: 'ticktick-private', schemaVersion: 1, exportedAt: '', data: { lists: [], tasks: [], habits: [], habitLogs: [] } })
    await importBackup(empty, db)
    expect(await db.tasks.count()).toBe(0)
    expect(await db.lists.count()).toBe(1) // la bandeja siempre existe
    expect(await hasUndoImport(db)).toBe(true)
    await undoImport(db)
    expect((await createBackup(db)).data).toEqual(before)
    expect(await hasUndoImport(db)).toBe(false)
  })
})

describe('parseBackup', () => {
  const valid = () => ({ app: 'ticktick-private', schemaVersion: 1, exportedAt: '', data: { lists: [], tasks: [], habits: [], habitLogs: [] } })

  it('rechaza archivos ajenos', () => {
    expect(() => parseBackup({ foo: 1 })).toThrow(BackupError)
    expect(() => parseBackup([])).toThrow(BackupError)
  })
  it('rechaza versiones futuras', () => {
    expect(() => parseBackup({ ...valid(), schemaVersion: 999 })).toThrow(/más nueva/)
  })
  it('rechaza filas inválidas con mensaje claro', () => {
    const b = valid()
    ;(b.data.tasks as unknown[]).push({ id: 'x', title: 3 })
    expect(() => parseBackup(b)).toThrow(/tareas con formato inválido \(fila 1\)/)
  })
  it('repara referencias rotas y registros duplicados', () => {
    const b = valid()
    ;(b.data.tasks as unknown[]).push({
      id: 't', listId: 'no-existe', title: 'X', notes: '', dueDate: null, dueTime: null, priority: 0,
      recurrence: null, completedAt: null, order: 0, createdAt: '', updatedAt: '',
    })
    ;(b.data.habitLogs as unknown[]).push({ id: 'l1', habitId: 'fantasma', date: '2026-11-22' })
    const r = parseBackup(b)
    expect(r.data.tasks[0]!.listId).toBe('inbox')
    expect(r.data.tasks[0]!.spawnedTaskId).toBeNull()
    expect(r.data.habitLogs).toHaveLength(0)
  })
})

describe('needsBackupReminder', () => {
  const now = new Date('2026-11-22T12:00:00Z')
  it('casos', () => {
    expect(needsBackupReminder(null, false, now)).toBe(false)
    expect(needsBackupReminder(null, true, now)).toBe(true)
    expect(needsBackupReminder('2026-11-20T12:00:00Z', true, now)).toBe(false)
    expect(needsBackupReminder('2026-11-15T12:00:00Z', true, now)).toBe(true)
  })
})
