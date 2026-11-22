import { addDays } from '../lib/dates'
import { DEFAULT_GOALS, DEFAULT_PROFILE, entryId } from '../lib/nutrition'
import { newId } from '../lib/workout'
import type { ForjaDB } from './db'
import type { DiaryEntry, DiarySlot, Food, FoodEntry, Goals, Meal, Profile } from './schema'
import { getSetting, setSetting } from './workouts'

const RECENT_MAX = 25

// ---------- perfil y metas ----------

export async function getProfile(db: ForjaDB): Promise<Profile> {
  return { ...DEFAULT_PROFILE, ...(await getSetting<Partial<Profile>>(db, 'profile', {})) }
}
export const saveProfile = (db: ForjaDB, p: Profile) => setSetting(db, 'profile', p)

export async function getGoals(db: ForjaDB): Promise<Goals> {
  return { ...DEFAULT_GOALS, ...(await getSetting<Partial<Goals>>(db, 'goals', {})) }
}
export const saveGoals = (db: ForjaDB, g: Goals) => setSetting(db, 'goals', g)

// ---------- diario ----------

export async function getRecentFoodIds(db: ForjaDB): Promise<string[]> {
  return getSetting<string[]>(db, 'recentFoods', [])
}

export async function addEntry(db: ForjaDB, date: string, slot: DiarySlot, entry: FoodEntry): Promise<DiaryEntry> {
  const row: DiaryEntry = { ...entry, id: entryId(), date, slot }
  await db.transaction('rw', db.diary, db.settings, async () => {
    await db.diary.put(row)
    if (entry.foodId) {
      const recent = await getRecentFoodIds(db)
      await setSetting(db, 'recentFoods', [entry.foodId, ...recent.filter((x) => x !== entry.foodId)].slice(0, RECENT_MAX))
    }
  })
  return row
}

export const updateEntry = (db: ForjaDB, id: string, patch: Partial<FoodEntry>) => db.diary.update(id, patch)
export const deleteEntry = (db: ForjaDB, id: string) => db.diary.delete(id)

export async function clearSlot(db: ForjaDB, date: string, slot: DiarySlot): Promise<void> {
  await db.diary.where('[date+slot]').equals([date, slot]).delete()
}

/** Entradas de un día en el orden en que se agregaron. */
export const entriesOn = (db: ForjaDB, date: string) => db.diary.where('date').equals(date).sortBy('id')

/** Copia las entradas de un día (todas o de una comida) a otro, con ids nuevos. */
export async function copyEntries(db: ForjaDB, from: string, to: string, slot?: DiarySlot): Promise<number> {
  const src = (await entriesOn(db, from)).filter((e) => !slot || e.slot === slot)
  await db.diary.bulkPut(src.map((e) => ({ ...e, id: entryId(), date: to })))
  return src.length
}

export const copyYesterday = (db: ForjaDB, date: string, slot?: DiarySlot) => copyEntries(db, addDays(date, -1), date, slot)

// ---------- agua ----------

export async function getWater(db: ForjaDB, date: string): Promise<number> {
  return (await db.water.get(date))?.ml ?? 0
}

export async function addWater(db: ForjaDB, date: string, deltaMl: number): Promise<number> {
  const ml = Math.max(0, (await getWater(db, date)) + deltaMl)
  if (ml === 0) await db.water.delete(date)
  else await db.water.put({ date, ml })
  return ml
}

// ---------- alimentos propios y comidas guardadas ----------

export async function saveCustomFood(db: ForjaDB, data: Omit<Food, 'id' | 'source'> & { id?: string }): Promise<Food> {
  const food: Food = { ...data, id: data.id ?? `c${newId()}`, source: 'custom' }
  await db.foods.put(food)
  return food
}

export async function deleteCustomFood(db: ForjaDB, id: string): Promise<void> {
  const f = await db.foods.get(id)
  if (f?.source === 'custom') await db.foods.delete(id)
}

export async function saveMealFromSlot(db: ForjaDB, date: string, slot: DiarySlot, name: string): Promise<Meal | null> {
  const entries = (await entriesOn(db, date)).filter((e) => e.slot === slot)
  if (!entries.length) return null
  const meal: Meal = {
    id: newId(),
    name: name.trim() || 'Mi comida',
    entries: entries.map(({ id: _id, date: _d, slot: _s, ...rest }) => rest),
  }
  await db.meals.put(meal)
  return meal
}

export async function addMeal(db: ForjaDB, meal: Meal, date: string, slot: DiarySlot): Promise<void> {
  await db.diary.bulkPut(meal.entries.map((e) => ({ ...e, id: entryId(), date, slot })))
}

export const deleteMeal = (db: ForjaDB, id: string) => db.meals.delete(id)
