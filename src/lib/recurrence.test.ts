import { describe, expect, it } from 'vitest'
import { describeRecurrence, nextOccurrence, stepOccurrence } from './recurrence'

// 2026-11-22 es domingo.
describe('stepOccurrence', () => {
  it('diaria', () => {
    expect(stepOccurrence({ kind: 'daily' }, '2026-11-30')).toBe('2026-12-01')
  })
  it('semanal en días elegidos', () => {
    const lmv = { kind: 'weekly' as const, days: [1, 3, 5] }
    expect(stepOccurrence(lmv, '2026-11-22')).toBe('2026-11-23') // dom → lun
    expect(stepOccurrence(lmv, '2026-11-23')).toBe('2026-11-25') // lun → mié
    expect(stepOccurrence(lmv, '2026-11-27')).toBe('2026-11-30') // vie → lun
  })
  it('semanal con un solo día salta una semana', () => {
    expect(stepOccurrence({ kind: 'weekly', days: [0] }, '2026-11-22')).toBe('2026-11-29')
  })
  it('mensual conserva el día ancla', () => {
    const rule = { kind: 'monthly' as const, day: 31 }
    expect(stepOccurrence(rule, '2026-01-31')).toBe('2026-02-28')
    expect(stepOccurrence(rule, '2026-02-28')).toBe('2026-03-31')
  })
})

describe('nextOccurrence', () => {
  it('a tiempo: la siguiente después de la fecha', () => {
    expect(nextOccurrence({ kind: 'daily' }, '2026-11-22', '2026-11-22')).toBe('2026-11-23')
  })
  it('completada antes: avanza desde la fecha, no desde hoy', () => {
    expect(nextOccurrence({ kind: 'daily' }, '2026-11-25', '2026-11-22')).toBe('2026-11-26')
  })
  it('atrasada: no genera ocurrencias vencidas', () => {
    expect(nextOccurrence({ kind: 'daily' }, '2026-11-10', '2026-11-22')).toBe('2026-11-22')
    expect(nextOccurrence({ kind: 'weekly', days: [1] }, '2026-11-02', '2026-11-22')).toBe('2026-11-23')
    expect(nextOccurrence({ kind: 'monthly', day: 5 }, '2026-08-05', '2026-11-22')).toBe('2026-12-05')
  })
})

describe('describeRecurrence', () => {
  it('textos', () => {
    expect(describeRecurrence({ kind: 'daily' })).toBe('Cada día')
    expect(describeRecurrence({ kind: 'weekly', days: [1, 2, 3, 4, 5] })).toBe('Entre semana')
    expect(describeRecurrence({ kind: 'weekly', days: [5, 1] })).toBe('Cada lunes, viernes')
    expect(describeRecurrence({ kind: 'monthly', day: 15 })).toBe('Cada mes, el día 15')
  })
})
