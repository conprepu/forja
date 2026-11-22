import { describe, expect, it } from 'vitest'
import type { HabitSchedule } from '../db/types'
import { computeStreak, countInWeek, describeSchedule, isDueToday, isScheduled } from './habits'

// Calendario: 2026-11-16 es lunes, 2026-11-22 es domingo.
const set = (...d: string[]) => new Set(d)
const daily: HabitSchedule = { kind: 'daily' }
const lmv: HabitSchedule = { kind: 'weekdays', days: [1, 3, 5] }
const x3: HabitSchedule = { kind: 'weekly', times: 3 }

describe('isScheduled', () => {
  it('días concretos', () => {
    expect(isScheduled(lmv, '2026-11-16')).toBe(true) // lun
    expect(isScheduled(lmv, '2026-11-17')).toBe(false) // mar
    expect(isScheduled(daily, '2026-11-17')).toBe(true)
  })
})

describe('computeStreak · diario', () => {
  it('sin registros', () => {
    expect(computeStreak(daily, set(), '2026-11-22')).toEqual({ current: 0, best: 0, unit: 'day' })
  })
  it('incluye hoy si está marcado', () => {
    expect(computeStreak(daily, set('2026-11-20', '2026-11-21', '2026-11-22'), '2026-11-22').current).toBe(3)
  })
  it('hoy sin marcar no rompe la racha', () => {
    expect(computeStreak(daily, set('2026-11-20', '2026-11-21'), '2026-11-22').current).toBe(2)
  })
  it('un día fallado rompe la racha', () => {
    const r = computeStreak(daily, set('2026-11-15', '2026-11-16', '2026-11-17', '2026-11-19', '2026-11-20'), '2026-11-22')
    expect(r.current).toBe(0) // falló ayer (21)
    expect(r.best).toBe(3)
  })
  it('ignora fechas futuras', () => {
    expect(computeStreak(daily, set('2026-11-22', '2026-11-23'), '2026-11-22').current).toBe(1)
  })
})

describe('computeStreak · días concretos', () => {
  it('los días no programados no rompen', () => {
    // lun 16, mié 18, vie 20 cumplidos; hoy domingo 22
    expect(computeStreak(lmv, set('2026-11-16', '2026-11-18', '2026-11-20'), '2026-11-22').current).toBe(3)
  })
  it('fallar un día programado rompe', () => {
    // lun 16 y vie 20 cumplidos, falta mié 18
    expect(computeStreak(lmv, set('2026-11-16', '2026-11-20'), '2026-11-22').current).toBe(1)
  })
  it('marcar un día no programado no suma', () => {
    expect(computeStreak(lmv, set('2026-11-20', '2026-11-21'), '2026-11-22').current).toBe(1)
  })
})

describe('computeStreak · X veces por semana', () => {
  it('cuenta semanas cumplidas consecutivas', () => {
    const done = set(
      '2026-11-02', '2026-11-04', '2026-11-06', // semana del 2: cumplida
      '2026-11-09', '2026-11-10', '2026-11-11', // semana del 9: cumplida
      '2026-11-16', // semana actual (16–22): en curso, 1/3
    )
    const r = computeStreak(x3, done, '2026-11-22')
    expect(r).toEqual({ current: 2, best: 2, unit: 'week' })
  })
  it('la semana actual cumplida suma', () => {
    const done = set('2026-11-09', '2026-11-10', '2026-11-11', '2026-11-16', '2026-11-17', '2026-11-18')
    expect(computeStreak(x3, done, '2026-11-18').current).toBe(2)
  })
  it('una semana pasada incumplida rompe', () => {
    const done = set(
      '2026-10-26', '2026-10-27', '2026-10-28', // cumplida
      '2026-11-02', // incumplida
      '2026-11-09', '2026-11-10', '2026-11-11', // cumplida
    )
    const r = computeStreak(x3, done, '2026-11-17')
    expect(r.current).toBe(1)
    expect(r.best).toBe(1)
  })
  it('countInWeek', () => {
    expect(countInWeek(set('2026-11-15', '2026-11-16', '2026-11-22', '2026-11-23'), '2026-11-19')).toBe(2)
  })
})

describe('isDueToday', () => {
  it('semanal: se oculta al cumplir la semana, salvo si se marcó hoy', () => {
    const done = set('2026-11-16', '2026-11-17', '2026-11-18')
    expect(isDueToday(x3, done, '2026-11-19')).toBe(false)
    expect(isDueToday(x3, done, '2026-11-18')).toBe(true)
    expect(isDueToday(x3, set('2026-11-16'), '2026-11-19')).toBe(true)
  })
  it('días concretos', () => {
    expect(isDueToday(lmv, set(), '2026-11-17')).toBe(false)
  })
})

describe('describeSchedule', () => {
  it('textos', () => {
    expect(describeSchedule(daily)).toBe('Cada día')
    expect(describeSchedule(lmv)).toBe('lun, mié, vie')
    expect(describeSchedule({ kind: 'weekdays', days: [1, 2, 3, 4, 5] })).toBe('Entre semana')
    expect(describeSchedule(x3)).toBe('3 veces por semana')
  })
})
