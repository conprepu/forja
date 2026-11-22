import { describe, expect, it } from 'vitest'
import type { Routine } from '../../src/db/schema'
import { dailyTotals, greeting, nutritionTrend, suggestRoutine, weekWorkoutDays } from '../../src/lib/today'

const routine = (id: string, order: number, lastUsedAt?: number): Routine => ({ id, name: id, order, items: [], ...(lastUsedAt ? { lastUsedAt } : {}) })
const at = (date: string, hour = 10) => new Date(`${date}T${String(hour).padStart(2, '0')}:00:00`).getTime()

describe('suggestRoutine', () => {
  it('sin rutinas no hay sugerencia', () => expect(suggestRoutine([])).toBeUndefined())
  it('las nunca usadas van primero, por orden', () => {
    expect(suggestRoutine([routine('b', 2), routine('a', 1), routine('c', 3, 500)])?.id).toBe('a')
  })
  it('rota: toca la que lleva más tiempo sin usarse', () => {
    expect(suggestRoutine([routine('push', 1, 300), routine('pull', 2, 100), routine('leg', 3, 200)])?.id).toBe('pull')
  })
  it('no modifica el arreglo recibido', () => {
    const rs = [routine('b', 2), routine('a', 1)]
    suggestRoutine(rs)
    expect(rs.map((r) => r.id)).toEqual(['b', 'a'])
  })
})

describe('weekWorkoutDays', () => {
  // 2026-11-18 es miércoles; la semana empieza el lunes 16.
  it('cuenta días distintos de la semana en curso', () => {
    const ws = [{ startedAt: at('2026-11-16') }, { startedAt: at('2026-11-16', 18) }, { startedAt: at('2026-11-18') }, { startedAt: at('2026-11-15') }]
    expect(weekWorkoutDays(ws, '2026-11-18')).toBe(2)
  })
  it('un entreno de las 11 pm cuenta para su día local', () => {
    expect(weekWorkoutDays([{ startedAt: at('2026-11-17', 23) }], '2026-11-17')).toBe(1)
  })
  it('sin entrenos, cero', () => expect(weekWorkoutDays([], '2026-11-18')).toBe(0))
})

describe('dailyTotals', () => {
  const e = (date: string, kcal: number, p = 0) => ({ date, kcal, p, c: 0, f: 0 })
  it('un renglón por día, del más viejo al más nuevo, con huecos', () => {
    const t = dailyTotals([e('2026-11-17', 500, 30), e('2026-11-17', 700, 20), e('2026-11-15', 900)], '2026-11-18', 4)
    expect(t.map((d) => [d.date, d.kcal, d.logged])).toEqual([
      ['2026-11-15', 900, true],
      ['2026-11-16', 0, false],
      ['2026-11-17', 1200, true],
      ['2026-11-18', 0, false],
    ])
    expect(t[2]!.p).toBe(50)
  })
  it('ignora lo que cae fuera del rango', () => {
    expect(dailyTotals([e('2026-10-01', 999)], '2026-11-18', 3).every((d) => !d.logged)).toBe(true)
  })
})

describe('nutritionTrend', () => {
  const day = (date: string, kcal: number, p: number, logged = true) => ({ date, kcal, p, c: 100, f: 50, logged })
  const goals = { kcal: 2000, p: 150 }
  it('promedia solo los días registrados', () => {
    const t = nutritionTrend([day('a', 2000, 150), day('b', 0, 0, false), day('c', 1000, 50)], goals)
    expect(t.loggedDays).toBe(2)
    expect(t.avg).toMatchObject({ kcal: 1500, p: 100, c: 100, f: 50 })
  })
  it('cuenta días en meta (±10 %) y con proteína (≥ 90 %)', () => {
    const t = nutritionTrend([day('a', 2150, 140), day('b', 2300, 150), day('c', 1850, 100)], goals)
    expect(t.onTargetDays).toBe(2)
    expect(t.proteinDays).toBe(2)
  })
  it('sin días registrados todo es cero', () => {
    expect(nutritionTrend([day('a', 0, 0, false)], goals)).toEqual({ loggedDays: 0, avg: { kcal: 0, p: 0, c: 0, f: 0 }, onTargetDays: 0, proteinDays: 0 })
  })
})

describe('greeting', () => {
  it('según la hora', () => {
    expect([2, 8, 15, 21].map(greeting)).toEqual(['Buenas noches', 'Buenos días', 'Buenas tardes', 'Buenas noches'])
  })
})
