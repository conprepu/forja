import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { AppDB } from './db'
import { INBOX_ID } from './types'

let db: AppDB
afterEach(async () => {
  await db.delete()
})

describe('AppDB', () => {
  it('crea la bandeja de entrada al iniciar', async () => {
    db = new AppDB('test-populate')
    const lists = await db.lists.toArray()
    expect(lists.map((l) => l.id)).toEqual([INBOX_ID])
  })

  it('no permite dos registros del mismo hábito en el mismo día', async () => {
    db = new AppDB('test-unique')
    await db.habitLogs.add({ id: 'a', habitId: 'h1', date: '2026-11-22' })
    await expect(db.habitLogs.add({ id: 'b', habitId: 'h1', date: '2026-11-22' })).rejects.toThrow()
  })
})
