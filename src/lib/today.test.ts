import { describe, expect, it } from 'vitest'
import type { Task } from '../db/types'
import { selectToday } from './today'

const t = (id: string, p: Partial<Task>): Task => ({
  id, listId: 'inbox', title: id, notes: '', dueDate: null, dueTime: null, priority: 0,
  recurrence: null, completedAt: null, spawnedTaskId: null, order: 0, createdAt: '', updatedAt: '', ...p,
})

describe('selectToday', () => {
  it('separa vencidas, de hoy y completadas hoy', () => {
    const r = selectToday([
      t('vencida', { dueDate: '2026-11-20' }),
      t('hoy', { dueDate: '2026-11-22' }),
      t('mañana', { dueDate: '2026-11-23' }),
      t('sinFecha', {}),
      t('hechaHoy', { dueDate: '2026-11-22', completedAt: '2026-11-22T10:00:00Z' }),
      t('hechaVencida', { dueDate: '2026-11-20', completedAt: '2026-11-21T10:00:00Z' }),
    ], '2026-11-22')
    expect(r.overdue.map((x) => x.id)).toEqual(['vencida'])
    expect(r.dueToday.map((x) => x.id)).toEqual(['hoy'])
    expect(r.doneToday.map((x) => x.id)).toEqual(['hechaHoy'])
  })
})
