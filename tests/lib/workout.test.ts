import { describe, expect, it } from 'vitest'
import type { ActiveWorkout, Routine, Workout } from '../../src/db/schema'
import {
  activeFromRoutine,
  activeFromWorkout,
  blankSet,
  doneSetCount,
  emptyActive,
  finishActive,
  isLastOfSuperset,
  linkWithNext,
  moveItem,
  normalizeSupersets,
  repsFromTarget,
  routineItemsFromWorkout,
  setLabel,
  shouldStartRest,
  supersetLetter,
  unlinkAt,
  workoutVolume,
} from '../../src/lib/workout'

const done = (weight: number, reps: number, type: 'normal' | 'warmup' = 'normal') => ({ ...blankSet(type), weight, reps, done: true })

describe('setLabel', () => {
  it('numera solo las series normales y usa letras para el resto', () => {
    const sets = [{ type: 'warmup' }, { type: 'normal' }, { type: 'normal' }, { type: 'drop' }, { type: 'failure' }, { type: 'normal' }] as const
    expect(sets.map((_, i) => setLabel([...sets], i))).toEqual(['C', '1', '2', 'D', 'F', '3'])
  })
})

describe('volumen', () => {
  it('suma kg×reps de las series hechas y excluye calentamientos', () => {
    const items = [{ sets: [done(100, 5), done(100, 5, 'warmup'), { ...blankSet(), weight: 100, reps: 5 }, done(60, 10)] }]
    expect(workoutVolume(items)).toBe(500 + 600)
  })
  it('puede omitir ejercicios que no son de fuerza', () => {
    const items = [
      { exerciseId: 'bench', sets: [done(100, 5)] },
      { exerciseId: 'tread', sets: [done(5, 30)] },
    ]
    expect(workoutVolume(items, (id) => id !== 'tread')).toBe(500)
  })
  it('cuenta series hechas', () => {
    expect(doneSetCount([{ sets: [done(1, 1), blankSet()] }, { sets: [done(1, 1)] }])).toBe(2)
  })
})

describe('repsFromTarget', () => {
  it('toma el primer número de la meta', () => {
    expect(repsFromTarget('8-12')).toBe(8)
    expect(repsFromTarget('10')).toBe(10)
    expect(repsFromTarget('')).toBeNull()
    expect(repsFromTarget(undefined)).toBeNull()
  })
})

describe('crear entrenos', () => {
  const routine: Routine = {
    id: 'r1',
    name: 'Push',
    order: 0,
    items: [
      { exerciseId: 'bench', restSec: 150, note: 'pausa', sets: [{ type: 'warmup' }, { type: 'normal', targetReps: '5-8', targetWeight: 80 }] },
      { exerciseId: 'ohp', restSec: 0, sets: [] },
    ],
  }

  it('desde una rutina: series vacías con metas y descanso por ejercicio', () => {
    const a = activeFromRoutine(routine, 1000, 90)
    expect(a).toMatchObject({ id: 'current', name: 'Push', routineId: 'r1', startedAt: 1000, restEndsAt: null })
    expect(a.items[0]?.sets).toEqual([
      { type: 'warmup', weight: null, reps: null, done: false },
      { type: 'normal', weight: null, reps: null, done: false, targetReps: '5-8', targetWeight: 80 },
    ])
    expect(a.items[0]).toMatchObject({ restSec: 150, note: 'pausa' })
    expect(a.items[1]?.sets).toHaveLength(1) // mínimo una serie
    expect(a.workoutId).toBeTruthy()
  })

  it('repetir un entreno conserva ejercicios y tipos pero no los valores', () => {
    const w: Workout = {
      id: 'w1', name: 'Pull', routineId: 'r9', startedAt: 1, endedAt: 2, note: '',
      items: [{ exerciseId: 'pull', sets: [{ type: 'warmup', weight: 0, reps: 5, done: true }, { type: 'normal', weight: 20, reps: 8, done: true }] }],
    }
    const a = activeFromWorkout(w, 5000, 120)
    expect(a.routineId).toBe('r9')
    expect(a.items[0]?.restSec).toBe(120)
    expect(a.items[0]?.sets.map((s) => [s.type, s.weight, s.reps, s.done])).toEqual([['warmup', null, null, false], ['normal', null, null, false]])
    expect(a.workoutId).not.toBe('w1')
  })

  it('de entreno a rutina: sin calentamientos, meta = reps máximas', () => {
    const w: Workout = {
      id: 'w1', name: 'X', startedAt: 1, endedAt: 2, note: '',
      items: [{ exerciseId: 'bench', restSec: 120, sets: [{ type: 'warmup', weight: 40, reps: 12, done: true }, { type: 'normal', weight: 80, reps: 8, done: true }, { type: 'normal', weight: 80, reps: 6, done: true }] }],
    }
    expect(routineItemsFromWorkout(w)).toEqual([
      { exerciseId: 'bench', restSec: 120, sets: [{ type: 'normal', targetReps: '8' }, { type: 'normal', targetReps: '8' }] },
    ])
  })
})

describe('finishActive', () => {
  const base = (): ActiveWorkout => ({
    ...emptyActive(1000, '  Mi push  '),
    workoutId: 'w1',
    routineId: 'r1',
    items: [
      { exerciseId: 'bench', restSec: 120, note: 'ok', sets: [{ ...done(80, 5), rpe: 8 }, { ...blankSet(), weight: 80, reps: 5 }, { ...blankSet(), done: true, reps: 6 }] },
      { exerciseId: 'ohp', sets: [blankSet()] },
    ],
  })

  it('guarda solo series hechas, quita ejercicios vacíos y completa nulos con 0', () => {
    const w = finishActive(base(), 5000)!
    expect(w).toMatchObject({ id: 'w1', routineId: 'r1', name: 'Mi push', startedAt: 1000, endedAt: 5000, note: '' })
    expect(w.items).toHaveLength(1)
    expect(w.items[0]).toMatchObject({ exerciseId: 'bench', restSec: 120, note: 'ok' })
    expect(w.items[0]?.sets).toEqual([
      { type: 'normal', weight: 80, reps: 5, rpe: 8, done: true },
      { type: 'normal', weight: 0, reps: 6, done: true },
    ])
  })
  it('sin series hechas no hay entreno', () => {
    const a = base()
    a.items = [{ exerciseId: 'ohp', sets: [blankSet()] }]
    expect(finishActive(a, 5000)).toBeNull()
    expect(finishActive({ ...a, items: [] }, 5000)).toBeNull()
  })
  it('nombre vacío = "Entrenamiento" y la hora de fin nunca es anterior al inicio', () => {
    const a = { ...base(), name: ' ' }
    const w = finishActive(a, 10)!
    expect(w.name).toBe('Entrenamiento')
    expect(w.endedAt).toBe(1000)
  })
})

describe('superseries', () => {
  const mk = (...ids: (string | undefined)[]) => ids.map((s, i) => ({ n: i, ...(s ? { supersetId: s } : {}) }))
  const ids = (xs: { supersetId?: string }[]) => xs.map((x) => x.supersetId)

  it('unir con el siguiente crea un grupo', () => {
    const r = linkWithNext(mk(undefined, undefined, undefined), 0)
    expect(r[0]?.supersetId).toBeTruthy()
    expect(r[1]?.supersetId).toBe(r[0]?.supersetId)
    expect(r[2]?.supersetId).toBeUndefined()
  })
  it('unir otro ejercicio amplía el grupo (tri-serie)', () => {
    const r = linkWithNext(linkWithNext(mk(undefined, undefined, undefined), 0), 1)
    expect(new Set(ids(r)).size).toBe(1)
    expect(r.every((x) => x.supersetId)).toBe(true)
  })
  it('unir dos grupos existentes los fusiona', () => {
    const r = linkWithNext(mk('a', 'a', 'b', 'b'), 1)
    expect(new Set(ids(r)).size).toBe(1)
  })
  it('unir el último no hace nada', () => {
    const items = mk(undefined, undefined)
    expect(linkWithNext(items, 1)).toBe(items)
  })
  it('quitar de la superserie disuelve las parejas', () => {
    expect(ids(unlinkAt(mk('a', 'a'), 0))).toEqual([undefined, undefined])
    const r = unlinkAt(mk('a', 'a', 'a'), 2)
    expect(ids(r)).toEqual(['a', 'a', undefined])
  })
  it('quitar de en medio deja solitarios sin grupo', () => {
    expect(ids(unlinkAt(mk('a', 'a', 'a'), 1))).toEqual([undefined, undefined, undefined])
  })
  it('mover un ejercicio que rompe la adyacencia disuelve el grupo', () => {
    const r = moveItem(mk('a', 'a', undefined), 1, 1)
    expect(ids(r)).toEqual([undefined, undefined, undefined])
  })
  it('mover dentro del grupo lo conserva', () => {
    const r = moveItem(mk('a', 'a', undefined), 0, 1)
    expect(ids(r)).toEqual(['a', 'a', undefined])
  })
  it('mover fuera de rango no cambia nada', () => {
    const items = mk('a', 'a')
    expect(moveItem(items, 0, -1)).toBe(items)
    expect(moveItem(items, 1, 1)).toBe(items)
  })
  it('normalize: el mismo id en rachas separadas recibe ids distintos', () => {
    const r = normalizeSupersets(mk('a', 'a', undefined, 'a', 'a'))
    expect(r[0]?.supersetId).toBe('a')
    expect(r[3]?.supersetId).toBeTruthy()
    expect(r[3]?.supersetId).not.toBe('a')
    expect(r[3]?.supersetId).toBe(r[4]?.supersetId)
  })

  it('descanso: solo tras el último ejercicio de la superserie y nunca tras calentamiento', () => {
    const items = [
      { exerciseId: 'a', supersetId: 's', sets: [] },
      { exerciseId: 'b', supersetId: 's', sets: [] },
      { exerciseId: 'c', sets: [] },
    ]
    expect([isLastOfSuperset(items, 0), isLastOfSuperset(items, 1), isLastOfSuperset(items, 2)]).toEqual([false, true, true])
    expect(shouldStartRest(items, 0, 'normal')).toBe(false)
    expect(shouldStartRest(items, 1, 'normal')).toBe(true)
    expect(shouldStartRest(items, 2, 'warmup')).toBe(false)
  })

  it('letra de la superserie por orden de aparición', () => {
    const items = mk('x', 'x', undefined, 'y', 'y')
    expect([0, 1, 2, 3, 4].map((i) => supersetLetter(items, i))).toEqual(['A', 'A', null, 'B', 'B'])
  })
})
