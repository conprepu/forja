import { describe, expect, it } from 'vitest'
import {
  applyMigration,
  convertPrototype,
  ML_PER_GLASS,
  parsePrototypeBackup,
  PROTO_MIGRATED_KEY,
  PROTOTYPE_STORAGE_KEY,
  readPrototypeLocalStorage,
} from '../../src/db/migratePrototype'
import { startup } from '../../src/db/startup'
import { freshDb, protoState } from './helpers'

describe('convertPrototype', () => {
  const res = convertPrototype(protoState())

  it('convierte ejercicios propios y el tipo de cada uno', () => {
    expect(res.exercises).toEqual([
      { id: 'x1a', name: 'Press landmine', muscle: 'Hombros', equipment: 'Barra', type: 'weight_reps', custom: true },
      { id: 'x2b', name: 'Dominada lastrada', muscle: 'Espalda', equipment: 'Otro', type: 'weight_reps', bodyweight: true, custom: true },
    ])
  })

  it('convierte alimentos propios a per100 + porciones', () => {
    expect(res.foods).toEqual([
      { id: 'cf1', name: 'Tamal de rajas', per100: { kcal: 190, p: 5, c: 24, f: 8 }, servings: [{ label: '1 tamal', grams: 150 }], source: 'custom' },
    ])
  })

  it('convierte rutinas: series como lista y reps meta como texto', () => {
    const [push, pull] = res.routines
    expect(push).toMatchObject({ id: 'r1', name: 'Push', order: 0, lastUsedAt: 1700000000000 })
    expect(push?.items[0]).toEqual({
      exerciseId: 'bench',
      restSec: 150,
      sets: Array.from({ length: 4 }, () => ({ type: 'normal', targetReps: '5-8' })),
    })
    expect(push?.items[1]?.sets).toEqual([{ type: 'normal' }, { type: 'normal' }, { type: 'normal' }])
    expect(pull?.order).toBe(1)
    expect(pull?.items[0]?.sets).toHaveLength(1) // mínimo una serie
    expect(pull).not.toHaveProperty('lastUsedAt')
  })

  it('une los entrenos de todos los meses y mapea los tipos de serie', () => {
    expect(res.workouts.map((w) => w.id).sort()).toEqual(['w1', 'w2'])
    const w1 = res.workouts.find((w) => w.id === 'w1')!
    expect(w1).toMatchObject({ routineId: 'r1', startedAt: 1698000000000, endedAt: 1698003600000 })
    expect(w1.items[0]?.sets.map((s) => [s.type, s.weight, s.reps, s.done])).toEqual([
      ['warmup', 40, 10, true],
      ['normal', 80, 5, true],
      ['drop', 60, 8, true],
      ['failure', 80, 7, true],
    ])
    expect(res.workouts.find((w) => w.id === 'w2')).not.toHaveProperty('routineId')
  })

  it('convierte el peso corporal a una fila por día', () => {
    expect(res.body).toEqual([
      { id: '2026-11-01', date: '2026-11-01', weight: 79.5 },
      { id: '2026-11-15', date: '2026-11-15', weight: 80.2 },
    ])
  })

  it('convierte el diario por comida y conserva los macros calculados', () => {
    expect(res.diary).toHaveLength(3)
    const byId = Object.fromEntries(res.diary.map((e) => [e.id, e]))
    expect(byId.d1).toEqual({ id: 'd1', date: '2026-11-20', slot: 'desayuno', name: 'Huevo entero', foodId: 'b10', grams: 150, kcal: 215, p: 19, c: 1, f: 14.3 })
    expect(byId.d2?.slot).toBe('comida')
    // agregado rápido: sin foodId ni gramos
    expect(byId.d3).toEqual({ id: 'd3', date: '2026-11-20', slot: 'snack', name: 'Agregado rápido', kcal: 150, p: 3, c: 20, f: 6 })
  })

  it('convierte vasos de agua a ml y omite días en cero', () => {
    expect(res.water).toEqual([{ date: '2026-11-20', ml: 6 * ML_PER_GLASS }])
  })

  it('convierte comidas guardadas', () => {
    expect(res.meals).toHaveLength(1)
    expect(res.meals[0]?.entries[0]).toEqual({ name: 'Huevo entero', foodId: 'b10', grams: 100, kcal: 143, p: 12.6, c: 0.7, f: 9.5 })
    expect(res.meals[0]?.entries[1]).not.toHaveProperty('foodId')
  })

  it('convierte perfil, metas (agua a ml), descanso y recientes', () => {
    const s = Object.fromEntries(res.settings.map((x) => [x.key, x.value]))
    expect(s.profile).toMatchObject({ age: 30, goal: 'ganar' })
    expect(s.goals).toEqual({ kcal: 2800, p: 170, c: 320, f: 80, waterMl: 10 * ML_PER_GLASS })
    expect(s.restSec).toBe(120)
    expect(s.recentFoods).toEqual(['b3', 'cf1'])
  })

  it('convierte el entreno activo: campos vacíos a null', () => {
    expect(res.activeWorkout).toEqual({
      id: 'current',
      workoutId: 'a1',
      routineId: 'r1',
      name: 'Push',
      startedAt: 1700000500000,
      restEndsAt: null,
      items: [
        {
          exerciseId: 'bench',
          restSec: 150,
          note: 'cuidar hombro',
          sets: [
            { type: 'warmup', weight: 40, reps: 10, done: true },
            { type: 'normal', weight: null, reps: null, done: false },
          ],
        },
      ],
    })
  })

  it('tolera datos vacíos o incompletos', () => {
    const empty = convertPrototype({ core: {} })
    expect(empty.workouts).toEqual([])
    expect(empty.settings).toEqual([])
    expect(empty.activeWorkout).toBeNull()
    expect(() => convertPrototype({ core: { routines: [null, 3], body: 'x', meals: [{}] }, w: 5, f: { a: null } })).not.toThrow()
  })

  it('rechaza lo que no es un estado del prototipo', () => {
    expect(() => convertPrototype(null)).toThrow()
    expect(() => convertPrototype({ nada: 1 })).toThrow(/prototipo/)
  })
})

describe('applyMigration', () => {
  it('escribe todo y las referencias a ejercicios y alimentos base resuelven', async () => {
    const db = await freshDb()
    const summary = await applyMigration(db, convertPrototype(protoState()))
    expect(summary).toMatchObject({ workouts: 2, diary: 3, routines: 2, body: 2, water: 1, activeWorkout: 1 })
    expect(await db.workouts.count()).toBe(2)
    for (const w of await db.workouts.toArray()) {
      for (const it of w.items) expect(await db.exercises.get(it.exerciseId)).toBeDefined()
    }
    for (const e of await db.diary.toArray()) {
      if (e.foodId) expect(await db.foods.get(e.foodId)).toBeDefined()
    }
    expect(await db.activeWorkout.get('current')).toBeDefined()
  })

  it('es idempotente: aplicarla dos veces no duplica', async () => {
    const db = await freshDb()
    const res = convertPrototype(protoState())
    await applyMigration(db, res)
    const counts = async () => [await db.workouts.count(), await db.diary.count(), await db.routines.count(), await db.body.count(), await db.meals.count(), await db.water.count()]
    const first = await counts()
    await applyMigration(db, res)
    expect(await counts()).toEqual(first)
  })

  it('no pisa un entreno en curso de la base nueva', async () => {
    const db = await freshDb()
    await db.activeWorkout.put({ id: 'current', workoutId: 'nuevo', name: 'Nuevo', startedAt: 1, restEndsAt: null, items: [] })
    const summary = await applyMigration(db, convertPrototype(protoState()))
    expect(summary.activeWorkout).toBe(0)
    expect((await db.activeWorkout.get('current'))?.workoutId).toBe('nuevo')
  })
})

describe('lectura del prototipo', () => {
  it('lee forja-v1 de localStorage', () => {
    const store = { getItem: (k: string) => (k === PROTOTYPE_STORAGE_KEY ? JSON.stringify(protoState()) : null) }
    expect(readPrototypeLocalStorage(store)).toMatchObject({ core: { rest: 120 } })
  })
  it('devuelve null si no hay datos o están rotos', () => {
    expect(readPrototypeLocalStorage({ getItem: () => null })).toBeNull()
    expect(readPrototypeLocalStorage({ getItem: () => '{roto' })).toBeNull()
    expect(readPrototypeLocalStorage({ getItem: () => '{"x":1}' })).toBeNull()
    expect(readPrototypeLocalStorage({ getItem: () => { throw new Error('bloqueado') } })).toBeNull()
  })
  it('el respaldo puede venir directo o envuelto en { data }', () => {
    const s = protoState()
    expect(parsePrototypeBackup(JSON.stringify(s))).toMatchObject({ core: { rest: 120 } })
    expect(parsePrototypeBackup(JSON.stringify({ app: 'forja', data: s }))).toMatchObject({ core: { rest: 120 } })
    expect(() => parsePrototypeBackup('{x')).toThrow()
    expect(() => parsePrototypeBackup('{"data":{}}')).toThrow(/prototipo/)
  })
})

describe('startup', () => {
  it('migra el localStorage una sola vez', async () => {
    const store = new Map([[PROTOTYPE_STORAGE_KEY, JSON.stringify(protoState())]])
    const original = globalThis.localStorage
    Object.defineProperty(globalThis, 'localStorage', { value: { getItem: (k: string) => store.get(k) ?? null }, configurable: true })
    try {
      const db = await freshDb(false)
      expect((await startup(db)).migrated).toBe(true)
      expect(await db.workouts.count()).toBe(2)
      expect(await db.settings.get(PROTO_MIGRATED_KEY)).toBeDefined()

      await db.workouts.clear()
      expect((await startup(db)).migrated).toBe(false)
      expect(await db.workouts.count()).toBe(0)
    } finally {
      Object.defineProperty(globalThis, 'localStorage', { value: original, configurable: true })
    }
  })

  it('sin datos del prototipo solo siembra y marca el chequeo', async () => {
    const db = await freshDb(false)
    expect((await startup(db)).migrated).toBe(false)
    expect(await db.exercises.count()).toBeGreaterThan(0)
    expect(await db.settings.get(PROTO_MIGRATED_KEY)).toBeDefined()
  })
})
