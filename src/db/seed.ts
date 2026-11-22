import exercisesJson from '../data/exercises.json'
import foodsJson from '../data/foods-mx.json'
import type { ForjaDB } from './db'
import type { Exercise, Food } from './schema'

/** Súbelo cuando cambien exercises.json o foods-mx.json para que se vuelva a sembrar. */
export const SEED_VERSION = 2
export const SEED_KEY = 'seedVersion'

type SeedExercise = Omit<Exercise, 'custom'>
type SeedFood = Omit<Food, 'source'>

export const seedExercises = exercisesJson as unknown as SeedExercise[]
export const seedFoods = foodsJson as unknown as SeedFood[]

/**
 * Carga los ejercicios y alimentos base. Idempotente: solo corre si cambió SEED_VERSION y
 * nunca pisa filas creadas por el usuario aunque compartan id.
 * @returns true si sembró.
 */
export async function seedDb(db: ForjaDB): Promise<boolean> {
  const current = await db.settings.get(SEED_KEY)
  if (current?.value === SEED_VERSION) return false

  await db.transaction('rw', db.exercises, db.foods, db.settings, async () => {
    const exs = await db.exercises.bulkGet(seedExercises.map((e) => e.id))
    await db.exercises.bulkPut(
      seedExercises.filter((_, i) => !exs[i]?.custom).map((e) => ({ ...e, custom: false })),
    )
    const foods = await db.foods.bulkGet(seedFoods.map((f) => f.id))
    await db.foods.bulkPut(
      seedFoods
        .filter((_, i) => !foods[i] || foods[i]?.source === 'local')
        .map((f) => ({ ...f, source: 'local' as const })),
    )
    await db.settings.put({ key: SEED_KEY, value: SEED_VERSION })
  })
  return true
}
