import { describe, expect, it, vi } from 'vitest'
import type { ForjaDB } from '../../src/db/db'
import type { Routine, Workout } from '../../src/db/schema'
import { loadActive } from '../../src/db/workouts'
import { createWorkoutStore } from '../../src/features/workout/store'
import { freshDb } from '../db/helpers'

const NOW = 1_700_000_000_000

function setup(db: ForjaDB) {
  const clock = { now: NOW }
  const store = createWorkoutStore(db, () => clock.now)
  return { store, clock, s: () => store.getState() }
}

const routine = (over: Partial<Routine> = {}): Routine => ({
  id: 'r1',
  name: 'Push',
  order: 0,
  items: [
    { exerciseId: 'bench', restSec: 120, sets: [{ type: 'warmup' }, { type: 'normal', targetReps: '5-8' }, { type: 'normal', targetReps: '5-8' }] },
    { exerciseId: 'ohp', restSec: 60, sets: [{ type: 'normal' }] },
  ],
  ...over,
})

const lastBench: Workout = {
  id: 'old',
  name: 'Push',
  startedAt: NOW - 86_400_000,
  endedAt: NOW - 86_000_000,
  note: '',
  items: [{ exerciseId: 'bench', sets: [{ type: 'warmup', weight: 40, reps: 10, done: true }, { type: 'normal', weight: 80, reps: 6, done: true }, { type: 'normal', weight: 80, reps: 5, done: true }] }],
}

describe('persistencia del entreno en curso', () => {
  it('sobrevive a "cerrar la app": un store nuevo recupera todo desde Dexie', async () => {
    const db = await freshDb()
    const a = setup(db)
    await a.s().hydrate()
    a.s().startEmpty()
    a.s().rename('Mi entreno')
    a.s().addExercises(['bench', 'squat'])
    a.s().updateSet(0, 0, { weight: 82.5, reps: 5 })
    a.s().setNote(0, 'cuidado hombro')
    await a.s().flush()

    const b = setup(db)
    expect(b.s().active).toBeNull()
    await b.s().hydrate()
    expect(b.s().ready).toBe(true)
    expect(b.s().active).toEqual(a.s().active)
    expect(b.s().active?.items[0]).toMatchObject({ exerciseId: 'bench', note: 'cuidado hombro' })
    expect(b.s().active?.items[0]?.sets[0]).toMatchObject({ weight: 82.5, reps: 5 })
  })

  it('guarda solo (con el debounce) sin llamar a flush', async () => {
    const db = await freshDb()
    const a = setup(db)
    a.s().startEmpty()
    a.s().addExercises(['bench'])
    await vi.waitFor(async () => expect((await loadActive(db))?.items).toHaveLength(1), { timeout: 2000 })
  })

  it('el descanso en curso es un timestamp que también se recupera', async () => {
    const db = await freshDb()
    const a = setup(db)
    a.s().startFromRoutine(routine())
    a.s().updateSet(0, 1, { weight: 80, reps: 5 })
    expect(a.s().toggleDone(0, 1)).toBe('done')
    await a.s().flush()
    const b = setup(db)
    await b.s().hydrate()
    expect(b.s().active?.restEndsAt).toBe(NOW + 120_000)
    expect(b.s().active?.restTotalSec).toBe(120)
  })

  it('descartar borra el entreno de la base', async () => {
    const db = await freshDb()
    const a = setup(db)
    a.s().startEmpty()
    a.s().addExercises(['bench'])
    await a.s().flush()
    expect(await loadActive(db)).toBeDefined()
    await a.s().discard()
    expect(a.s().active).toBeNull()
    expect(await loadActive(db)).toBeUndefined()
    // y un cambio pendiente no lo "resucita"
    await new Promise((r) => setTimeout(r, 350))
    expect(await loadActive(db)).toBeUndefined()
  })

  it('no empieza otro entreno si ya hay uno en curso', async () => {
    const db = await freshDb()
    const a = setup(db)
    a.s().startEmpty()
    const id = a.s().active?.workoutId
    a.s().startFromRoutine(routine())
    expect(a.s().active?.workoutId).toBe(id)
  })
})

describe('series', () => {
  it('"Anterior" se carga del historial y rellena series vacías al marcar ✓', async () => {
    const db = await freshDb()
    await db.workouts.put(lastBench)
    const a = setup(db)
    a.s().startFromRoutine(routine())
    await vi.waitFor(() => expect(a.s().prev.bench).toHaveLength(3))

    // serie 1 (índice 1) vacía → toma 80×6 de la última vez
    expect(a.s().toggleDone(0, 1)).toBe('done')
    expect(a.s().active?.items[0]?.sets[1]).toMatchObject({ weight: 80, reps: 6, done: true })
  })

  it('sin anterior usa la meta de la rutina; sin nada pide las repeticiones', async () => {
    const db = await freshDb()
    const a = setup(db)
    a.s().startFromRoutine(routine())
    await vi.waitFor(() => expect(a.s().prev.bench).toEqual([]))
    expect(a.s().toggleDone(0, 1)).toBe('done')
    expect(a.s().active?.items[0]?.sets[1]).toMatchObject({ reps: 5, done: true }) // "5-8" → 5
    expect(a.s().toggleDone(1, 0)).toBe('missing-reps')
    expect(a.s().active?.items[1]?.sets[0]?.done).toBe(false)
    expect(a.s().active?.restEndsAt).toBe(NOW + 120_000) // solo la serie que sí se marcó
  })

  it('lo escrito a mano gana sobre "Anterior"', async () => {
    const db = await freshDb()
    await db.workouts.put(lastBench)
    const a = setup(db)
    a.s().startFromRoutine(routine())
    await vi.waitFor(() => expect(a.s().prev.bench).toHaveLength(3))
    a.s().updateSet(0, 1, { weight: 85 })
    a.s().toggleDone(0, 1)
    expect(a.s().active?.items[0]?.sets[1]).toMatchObject({ weight: 85, reps: 6 })
  })

  it('desmarcar no inicia descanso y deja los valores', async () => {
    const db = await freshDb()
    const a = setup(db)
    a.s().startEmpty()
    a.s().addExercises(['bench'])
    a.s().updateSet(0, 0, { weight: 60, reps: 8 })
    a.s().toggleDone(0, 0)
    a.s().endRest()
    expect(a.s().toggleDone(0, 0)).toBe('undone')
    expect(a.s().active?.items[0]?.sets[0]).toMatchObject({ weight: 60, reps: 8, done: false })
    expect(a.s().active?.restEndsAt).toBeNull()
  })

  it('copyPrev copia sin marcar; addSet hereda la meta; calentamientos van al inicio', async () => {
    const db = await freshDb()
    await db.workouts.put(lastBench)
    const a = setup(db)
    a.s().startFromRoutine(routine())
    await vi.waitFor(() => expect(a.s().prev.bench).toHaveLength(3))
    a.s().copyPrev(0, 2)
    expect(a.s().active?.items[0]?.sets[2]).toMatchObject({ weight: 80, reps: 5, done: false })
    a.s().addSet(0)
    expect(a.s().active?.items[0]?.sets[3]).toMatchObject({ type: 'normal', targetReps: '5-8', weight: null })
    a.s().insertWarmups(1, [{ kg: 20, reps: 10 }, { kg: 30, reps: 5 }])
    expect(a.s().active?.items[1]?.sets.map((s) => [s.type, s.weight, s.reps])).toEqual([['warmup', 20, 10], ['warmup', 30, 5], ['normal', null, null]])
    a.s().setSetType(0, 3, 'drop')
    a.s().removeSet(0, 0)
    expect(a.s().active?.items[0]?.sets).toHaveLength(3)
    expect(a.s().active?.items[0]?.sets[2]?.type).toBe('drop')
  })
})

describe('descanso', () => {
  async function resting() {
    const db = await freshDb()
    const a = setup(db)
    a.s().startFromRoutine(routine())
    a.s().updateSet(0, 1, { weight: 80, reps: 5 })
    a.s().toggleDone(0, 1) // 120 s
    return a
  }

  it('arranca con la hora de fin, no con un contador', async () => {
    const a = await resting()
    expect(a.s().active).toMatchObject({ restEndsAt: NOW + 120_000, restTotalSec: 120 })
  })
  it('los calentamientos no inician descanso', async () => {
    const db = await freshDb()
    const a = setup(db)
    a.s().startFromRoutine(routine())
    a.s().updateSet(0, 0, { weight: 40, reps: 10 })
    a.s().toggleDone(0, 0)
    expect(a.s().active?.restEndsAt).toBeNull()
  })
  it('ejercicio con descanso 0 no inicia descanso', async () => {
    const db = await freshDb()
    const a = setup(db)
    a.s().startEmpty()
    a.s().addExercises(['bench'])
    a.s().setRest(0, 0)
    a.s().updateSet(0, 0, { weight: 1, reps: 1 })
    a.s().toggleDone(0, 0)
    expect(a.s().active?.restEndsAt).toBeNull()
  })
  it('+15 y −15 mueven la hora de fin', async () => {
    const a = await resting()
    a.s().adjustRest(15)
    expect(a.s().active).toMatchObject({ restEndsAt: NOW + 135_000, restTotalSec: 135 })
    a.s().adjustRest(-15)
    expect(a.s().active?.restEndsAt).toBe(NOW + 120_000)
  })
  it('restar más de lo que queda termina el descanso', async () => {
    const a = await resting()
    a.clock.now = NOW + 110_000
    a.s().adjustRest(-15)
    expect(a.s().active?.restEndsAt).toBeNull()
  })
  it('ajustar sin descanso en curso no hace nada', async () => {
    const a = await resting()
    a.s().endRest()
    a.s().adjustRest(15)
    expect(a.s().active?.restEndsAt).toBeNull()
  })
  it('superserie: el descanso llega solo tras el último ejercicio de la ronda', async () => {
    const db = await freshDb()
    const a = setup(db)
    a.s().startEmpty()
    a.s().addExercises(['bench', 'pull', 'squat'])
    a.s().linkNext(0)
    expect(a.s().active?.items[0]?.supersetId).toBeTruthy()
    expect(a.s().active?.items[0]?.supersetId).toBe(a.s().active?.items[1]?.supersetId)
    a.s().updateSet(0, 0, { weight: 50, reps: 8 })
    a.s().toggleDone(0, 0)
    expect(a.s().active?.restEndsAt).toBeNull()
    a.s().updateSet(1, 0, { weight: 0, reps: 8 })
    a.s().toggleDone(1, 0)
    expect(a.s().active?.restEndsAt).toBe(NOW + 90_000)
  })
})

describe('ejercicios', () => {
  it('quitar o mover un ejercicio de una superserie la disuelve', async () => {
    const db = await freshDb()
    const a = setup(db)
    a.s().startEmpty()
    a.s().addExercises(['bench', 'pull', 'squat'])
    a.s().linkNext(0)
    a.s().removeExercise(1)
    expect(a.s().active?.items.map((i) => i.exerciseId)).toEqual(['bench', 'squat'])
    expect(a.s().active?.items.every((i) => !i.supersetId)).toBe(true)

    a.s().addExercises(['ohp'])
    a.s().linkNext(0)
    a.s().moveExercise(1, 1)
    expect(a.s().active?.items.every((i) => !i.supersetId)).toBe(true)
    a.s().unlink(0) // sin superserie: no pasa nada
    expect(a.s().active?.items).toHaveLength(3)
  })
})

describe('terminar', () => {
  it('guarda el entreno, calcula récords y deja la base limpia', async () => {
    const db = await freshDb()
    await db.workouts.put(lastBench)
    const a = setup(db)
    a.s().startFromRoutine(routine())
    await vi.waitFor(() => expect(a.s().prev.bench).toHaveLength(3))
    a.s().updateSet(0, 1, { weight: 85, reps: 6 })
    a.s().toggleDone(0, 1)
    a.clock.now = NOW + 3_000_000

    const res = await a.s().finish()
    expect(res).toMatchObject({ durationSec: 3000, sets: 1, volume: 510 })
    // 85 kg supera el peso y el 1RM de la última vez; el volumen (510) no supera 880
    expect(res?.prs.map((p) => p.kind).sort()).toEqual(['e1rm', 'weight'])
    expect(a.s().active).toBeNull()
    expect(await loadActive(db)).toBeUndefined()
    expect(await db.workouts.count()).toBe(2)
    expect((await db.routines.get('r1'))).toBeUndefined() // la rutina del test no existe en la base: no truena
  })

  it('sin series hechas no termina nada y el entreno sigue', async () => {
    const db = await freshDb()
    const a = setup(db)
    a.s().startFromRoutine(routine())
    expect(await a.s().finish()).toBeNull()
    expect(a.s().active).not.toBeNull()
    expect(await db.workouts.count()).toBe(0)
  })

  it('finish sin entreno devuelve null', async () => {
    const db = await freshDb()
    expect(await setup(db).s().finish()).toBeNull()
  })
})

describe('ajustes', () => {
  it('RPE y descanso por defecto persisten', async () => {
    const db = await freshDb()
    await db.settings.put({ key: 'restSec', value: 150 })
    const a = setup(db)
    await a.s().hydrate()
    expect(a.s().restDefault).toBe(150)
    expect(a.s().showRpe).toBe(false)
    a.s().setShowRpe(true)
    a.s().startEmpty()
    a.s().addExercises(['bench'])
    expect(a.s().active?.items[0]?.restSec).toBe(150)
    await a.s().flush()
    const b = setup(db)
    await b.s().hydrate()
    expect(b.s().showRpe).toBe(true)
  })
})
