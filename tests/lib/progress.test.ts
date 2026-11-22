import { describe, expect, it } from 'vitest'
import type { Workout } from '../../src/db/schema'
import { addDays, addMonths, localDate, monthGrid, startOfWeek } from '../../src/lib/dates'
import {
  exerciseCounts,
  exerciseSeries,
  inRange,
  muscleSets,
  seriesBests,
  summarize,
  weeklyVolumes,
  workoutsByDay,
} from '../../src/lib/progress'

const at = (date: string, h = 10) => new Date(`${date}T${String(h).padStart(2, '0')}:00:00`).getTime()
const set = (weight: number, reps: number, type: 'normal' | 'warmup' = 'normal') => ({ type, weight, reps, done: true as const })
const w = (id: string, date: string, items: Workout['items'], h = 10, mins = 60): Workout => ({
  id, name: id, startedAt: at(date, h), endedAt: at(date, h) + mins * 60_000, note: '', items,
})

describe('fechas', () => {
  it('localDate usa la hora local', () => {
    expect(localDate(new Date(2026, 10, 22, 23, 59))).toBe('2026-11-22')
    expect(localDate(new Date(2026, 10, 22, 0, 1))).toBe('2026-11-22')
  })
  it('addDays cruza meses y años', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01')
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
  it('la semana empieza el lunes', () => {
    expect(startOfWeek('2026-11-22')).toBe('2026-11-16') // domingo
    expect(startOfWeek('2026-11-16')).toBe('2026-11-16') // lunes
    expect(startOfWeek('2026-11-18')).toBe('2026-11-16')
  })
  it('addMonths', () => {
    expect(addMonths('2026-11', 1)).toBe('2026-12')
    expect(addMonths('2026-01', -1)).toBe('2025-12')
    expect(addMonths('2026-11', 14)).toBe('2028-01')
  })
  it('monthGrid: semanas completas lunes-domingo', () => {
    const g = monthGrid('2026-11') // 1 nov 2026 es domingo
    expect(g.every((wk) => wk.length === 7)).toBe(true)
    expect(g[0]).toEqual([null, null, null, null, null, null, '2026-11-01'])
    expect(g.flat().filter(Boolean)).toHaveLength(30)
    expect(g.at(-1)?.at(-1)).toBeNull()
  })
})

describe('exerciseSeries', () => {
  const ws = [
    w('b', '2026-11-10', [{ exerciseId: 'bench', sets: [set(60, 10, 'warmup'), set(85, 5)] }]),
    w('a', '2026-11-03', [{ exerciseId: 'bench', sets: [set(80, 5), set(80, 4)] }, { exerciseId: 'ohp', sets: [set(40, 8)] }]),
    w('c', '2026-11-17', [{ exerciseId: 'squat', sets: [set(100, 5)] }]),
  ]
  it('una marca por entreno, en orden cronológico, sin calentamientos', () => {
    const s = exerciseSeries(ws, { id: 'bench', type: 'weight_reps' })
    expect(s.map((p) => [p.date, p.weight, p.volume])).toEqual([['2026-11-03', 80, 720], ['2026-11-10', 85, 425]])
    expect(s[1]?.e1rm).toBeCloseTo(85 * (1 + 5 / 30), 6)
  })
  it('un ejercicio sin historial da lista vacía', () => {
    expect(exerciseSeries(ws, { id: 'pull', type: 'weight_reps' })).toEqual([])
  })
  it('peso corporal: repeticiones', () => {
    const s = exerciseSeries([w('x', '2026-11-01', [{ exerciseId: 'push', sets: [set(0, 20), set(0, 25)] }])], { id: 'push', type: 'weight_reps' })
    expect(s[0]).toMatchObject({ reps: 25 })
    expect(s[0]?.weight).toBeUndefined()
  })
  it('seriesBests toma el máximo de cada marca', () => {
    const s = exerciseSeries(ws, { id: 'bench', type: 'weight_reps' })
    expect(seriesBests(s)).toMatchObject({ weight: 85, volume: 720 })
    expect(seriesBests([])).toEqual({})
  })
  it('exerciseCounts cuenta entrenos, no series', () => {
    const c = exerciseCounts(ws)
    expect(c.get('bench')).toBe(2)
    expect(c.get('ohp')).toBe(1)
  })
})

describe('resúmenes', () => {
  const ws = [
    w('a', '2026-11-09', [{ exerciseId: 'bench', sets: [set(100, 5)] }], 10, 45),
    w('b', '2026-11-12', [{ exerciseId: 'bench', sets: [set(100, 5), set(50, 10, 'warmup')] }, { exerciseId: 'tread', sets: [set(5, 30)] }], 10, 30),
    w('c', '2026-11-18', [{ exerciseId: 'squat', sets: [set(120, 5)] }]),
  ]
  it('suma entrenos, volumen, duración y series', () => {
    const s = summarize(inRange(ws, '2026-11-09', '2026-11-15'), (id) => id !== 'tread')
    expect(s).toEqual({ workouts: 2, volume: 1000, durationSec: 75 * 60, sets: 4 })
  })
  it('un entreno a las 11:30 pm cuenta para ese día', () => {
    const late = w('late', '2026-11-15', [{ exerciseId: 'bench', sets: [set(1, 1)] }], 23)
    expect(inRange([late], '2026-11-15', '2026-11-15')).toHaveLength(1)
    expect(inRange([late], '2026-11-16', '2026-11-22')).toHaveLength(0)
  })
  it('volumen semanal de las últimas semanas', () => {
    const r = weeklyVolumes(ws, '2026-11-18', 3)
    expect(r.map((x) => x.weekStart)).toEqual(['2026-11-02', '2026-11-09', '2026-11-16'])
    expect(r.map((x) => x.volume)).toEqual([0, 500 + 500 + 150, 600])
    expect(r.map((x) => x.workouts)).toEqual([0, 2, 1])
  })
  it('series por músculo, sin calentamientos y de mayor a menor', () => {
    const muscle = (id: string) => ({ bench: 'Pecho', squat: 'Cuádriceps' })[id]
    expect(muscleSets(ws, muscle)).toEqual([{ muscle: 'Pecho', sets: 2 }, { muscle: 'Cuádriceps', sets: 1 }])
  })
  it('agrupa por día', () => {
    const m = workoutsByDay([...ws, w('d', '2026-11-12', [{ exerciseId: 'ohp', sets: [set(40, 8)] }], 18)])
    expect(m.get('2026-11-12')?.map((x) => x.id)).toEqual(['b', 'd'])
    expect(m.size).toBe(3)
  })
})
