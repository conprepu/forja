import { describe, expect, it } from 'vitest'
import type { Task } from '../db/types'
import { sortTasks } from './taskSort'

const t = (id: string, p: Partial<Task>): Task => ({
  id, listId: 'inbox', title: id, notes: '', dueDate: null, dueTime: null, priority: 0,
  recurrence: null, completedAt: null, spawnedTaskId: null, order: 0, createdAt: '', updatedAt: '', ...p,
})

describe('sortTasks', () => {
  it('prioridad, fecha, hora y orden', () => {
    const tasks = [
      t('sinFecha', { order: 1 }),
      t('alta', { priority: 3, dueDate: '2026-12-01' }),
      t('hoyTarde', { dueDate: '2026-11-22', dueTime: '18:00' }),
      t('hoySinHora', { dueDate: '2026-11-22' }),
      t('hoyTemprano', { dueDate: '2026-11-22', dueTime: '08:00' }),
      t('ayer', { dueDate: '2026-11-21' }),
      t('sinFecha0', { order: 0 }),
    ]
    expect(sortTasks(tasks).map((x) => x.id)).toEqual([
      'alta', 'ayer', 'hoyTemprano', 'hoyTarde', 'hoySinHora', 'sinFecha0', 'sinFecha',
    ])
  })
})
