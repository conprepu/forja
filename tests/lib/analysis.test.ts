import { describe, expect, it } from 'vitest'
import type { Exercise, SetType, Workout } from '../../src/db/schema'
import { analyzeWorkout, comparableWorkout } from '../../src/lib/analysis'

const EX: Record<string, Exercise> = {
  bench: { id: 'bench', name: 'Press de banca', muscle: 'Pecho', equipment: 'Barra', type: 'weight_reps', custom: false },
  ohp: { id: 'ohp', name: 'Press militar', muscle: 'Hombros', equipment: 'Barra', type: 'weight_reps', custom: false },
  tri: { id: 'tri', name: 'Extensión', muscle: 'Tríceps', equipment: 'Polea', type: 'weight_reps', custom: false },
  row: { id: 'row', name: 'Remo', muscle: 'Espalda', equipment: 'Barra', type: 'weight_reps', custom: false },
  run: { id: 'run', name: 'Caminadora', muscle: 'Cardio', equipment: 'Máquina', type: 'distance', custom: false },
}
const exOf = (id: string) => EX[id]

const DAY = 86400000
let n = 0
function workout(day: number, name: string, items: [string, [number, number, SetType?][]][], opts: Partial<Workout> = {}): Workout {
  const startedAt = Date.UTC(2026, 10, 1) + day * DAY
  return {
    id: `w${++n}`,
    name,
    startedAt,
    endedAt: startedAt + 60 * 60000,
    note: '',
    items: items.map(([exerciseId, sets]) => ({ exerciseId, sets: sets.map(([weight, reps, type = 'normal']) => ({ type, weight, reps, done: true })) })),
    ...opts,
  }
}

describe('comparableWorkout', () => {
  it('prefiere la misma rutina, luego el mismo nombre, y nunca uno posterior', () => {
    const a = workout(0, 'Push', [['bench', [[60, 8]]]], { routineId: 'r1' })
    const b = workout(2, 'Pull', [['row', [[50, 8]]]])
    const c = workout(4, 'otro nombre', [['bench', [[60, 8]]]], { routineId: 'r1' })
    const later = workout(9, 'Push', [['bench', [[99, 8]]]])
    expect(comparableWorkout(c, [a, b, later])?.id).toBe(a.id)
    expect(comparableWorkout(workout(5, 'PUSH', [['bench', [[60, 8]]]]), [a, b])?.id).toBe(a.id)
    expect(comparableWorkout(workout(5, 'Brazos', [['bench', [[60, 8]]]]), [a, b])).toBeNull()
  })
})

describe('analizar un entreno', () => {
  const prev = workout(0, 'Push', [['bench', [[60, 8], [60, 8], [60, 8]]], ['ohp', [[30, 10], [30, 10]]]], { routineId: 'r1' })

  it('compara volumen y marcas con la última vez', () => {
    const now = workout(7, 'Push', [['bench', [[65, 8], [65, 8], [65, 8]]], ['ohp', [[30, 10], [30, 10]]]], { routineId: 'r1' })
    const a = analyzeWorkout(now, [prev], exOf)
    expect(a.workSets).toBe(5)
    expect(a.compare?.volumePct).toBeGreaterThan(0)
    const bench = a.exercises.find((e) => e.exerciseId === 'bench')!
    expect(bench.trend).toBe('sube')
    expect(bench.change).toBeCloseTo(8.3, 1)
    expect(a.exercises.find((e) => e.exerciseId === 'ohp')!.trend).toBe('igual')
    expect(a.notes.join(' ')).toMatch(/más volumen que tu último «Push»/)
    expect(a.notes.join(' ')).toMatch(/1 de 2 ejercicios subieron contra la última vez y el resto se mantuvo/)
  })

  it('un ejercicio sin historial es "nuevo"', () => {
    const a = analyzeWorkout(workout(7, 'Push', [['tri', [[20, 12], [20, 12]]]]), [prev], exOf)
    expect(a.exercises[0]).toMatchObject({ trend: 'nuevo', change: null })
  })

  it('los calentamientos no cuentan como trabajo ni como músculo', () => {
    const w = workout(1, 'x', [['bench', [[20, 10, 'warmup'], [60, 8], [60, 8]]]])
    const a = analyzeWorkout(w, [], exOf)
    expect(a.workSets).toBe(2)
    expect(a.warmupSets).toBe(1)
    expect(a.muscles).toEqual([{ muscle: 'Pecho', sets: 2, share: 1 }])
    expect(a.volume).toBe(960)
  })

  it('cardio no entra en los músculos ni en el volumen', () => {
    const a = analyzeWorkout(workout(1, 'x', [['run', [[5, 30]]], ['bench', [[60, 8]]]]), [], exOf)
    expect(a.muscles.map((m) => m.muscle)).toEqual(['Pecho'])
    expect(a.volume).toBe(480)
  })

  it('avisa si solo hubo empuje', () => {
    const w = workout(1, 'x', [['bench', [[60, 8], [60, 8], [60, 8]]], ['ohp', [[30, 8], [30, 8]]]])
    expect(analyzeWorkout(w, [], exOf).notes.join(' ')).toMatch(/Solo empuje hoy \(5 series\)/)
  })

  it('consejos: subir peso, repetir y descansar', () => {
    const subir = analyzeWorkout(workout(7, 'x', [['bench', [[40, 12], [40, 13], [40, 12]]]]), [], exOf)
    expect(subir.exercises[0]!.tip).toBe('subir')
    const baja = analyzeWorkout(workout(7, 'Push', [['bench', [[50, 8], [50, 8]]]]), [prev], exOf)
    expect(baja.exercises[0]).toMatchObject({ trend: 'baja', tip: 'repetir' })
    const cae = analyzeWorkout(workout(7, 'x', [['bench', [[60, 10], [60, 7], [60, 5]]]]), [], exOf)
    expect(cae.exercises[0]!.tip).toBe('descansar')
  })

  it('RPE medio y series al fallo', () => {
    const w = workout(1, 'x', [['bench', [[60, 8], [60, 8, 'failure']]]])
    w.items[0]!.sets.forEach((s) => (s.rpe = 9.5))
    const a = analyzeWorkout(w, [], exOf)
    expect(a.avgRpe).toBe(9.5)
    expect(a.failureSets).toBe(1)
    expect(a.notes.join(' ')).toMatch(/RPE medio 9.5/)
  })

  it('un entreno sin historial ni músculos conocidos no truena', () => {
    const a = analyzeWorkout(workout(1, 'x', [['desconocido', [[10, 10]]]]), [], () => undefined)
    expect(a.exercises[0]).toMatchObject({ name: 'desconocido', trend: 'nuevo' })
    expect(a.muscles).toEqual([])
    expect(a.compare).toBeNull()
  })

  it('serie principal = la de mayor 1RM', () => {
    const a = analyzeWorkout(workout(1, 'x', [['bench', [[60, 8], [70, 5], [50, 12]]]]), [], exOf)
    expect(a.exercises[0]!.top).toEqual({ weight: 70, reps: 5 })
  })
})
