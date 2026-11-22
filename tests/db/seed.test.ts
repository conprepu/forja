import { describe, expect, it } from 'vitest'
import { SEED_KEY, seedExercises, seedFoods, seedDb } from '../../src/db/seed'
import { freshDb } from './helpers'

describe('seed', () => {
  it('carga ejercicios y alimentos base', async () => {
    const db = await freshDb()
    expect(await db.exercises.count()).toBe(seedExercises.length)
    expect(await db.foods.count()).toBe(seedFoods.length)
    expect((await db.exercises.get('bench'))?.custom).toBe(false)
    expect((await db.foods.get('b0'))?.source).toBe('local')
  })

  it('los ids del catálogo son únicos y los tipos válidos', () => {
    expect(new Set(seedExercises.map((e) => e.id)).size).toBe(seedExercises.length)
    expect(new Set(seedFoods.map((f) => f.id)).size).toBe(seedFoods.length)
    const types = new Set(['weight_reps', 'reps', 'time', 'distance'])
    for (const e of seedExercises) expect(types.has(e.type)).toBe(true)
    for (const f of seedFoods) expect(f.per100.kcal).toBeGreaterThanOrEqual(0)
  })

  it('es idempotente: una segunda corrida no hace nada', async () => {
    const db = await freshDb()
    expect(await seedDb(db)).toBe(false)
    expect(await db.exercises.count()).toBe(seedExercises.length)
  })

  it('al resembrar no pisa ejercicios ni alimentos del usuario con el mismo id', async () => {
    const db = await freshDb()
    await db.exercises.put({ id: 'bench', name: 'Mi banca', muscle: 'Pecho', equipment: 'Barra', type: 'weight_reps', custom: true })
    await db.foods.put({ id: 'b0', name: 'Mi pollo', per100: { kcal: 1, p: 1, c: 1, f: 1 }, servings: [], source: 'custom' })
    await db.settings.delete(SEED_KEY)
    expect(await seedDb(db)).toBe(true)
    expect((await db.exercises.get('bench'))?.name).toBe('Mi banca')
    expect((await db.foods.get('b0'))?.name).toBe('Mi pollo')
  })

  it('al resembrar restaura filas del seed modificadas', async () => {
    const db = await freshDb()
    await db.exercises.update('bench', { name: 'roto' })
    await db.settings.delete(SEED_KEY)
    await seedDb(db)
    expect((await db.exercises.get('bench'))?.name).toBe('Press de banca')
  })
})
