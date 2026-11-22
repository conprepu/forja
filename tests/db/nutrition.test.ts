import { describe, expect, it } from 'vitest'
import {
  addEntry,
  addMeal,
  addWater,
  clearSlot,
  copyEntries,
  copyYesterday,
  deleteCustomFood,
  deleteEntry,
  entriesOn,
  getGoals,
  getProfile,
  getRecentFoodIds,
  getWater,
  saveCustomFood,
  saveGoals,
  saveMealFromSlot,
  saveProfile,
  updateEntry,
} from '../../src/db/nutrition'
import { DEFAULT_GOALS, DEFAULT_PROFILE, entryFromFood, quickEntry } from '../../src/lib/nutrition'
import { freshDb } from './helpers'

const D = '2026-11-20'

describe('perfil y metas', () => {
  it('valores por defecto y guardado parcial', async () => {
    const db = await freshDb()
    expect(await getProfile(db)).toEqual(DEFAULT_PROFILE)
    expect(await getGoals(db)).toEqual(DEFAULT_GOALS)
    await saveGoals(db, { ...DEFAULT_GOALS, kcal: 2800 })
    expect((await getGoals(db)).kcal).toBe(2800)
    await db.settings.put({ key: 'profile', value: { age: 31 } }) // p. ej. migrado con campos faltantes
    expect(await getProfile(db)).toEqual({ ...DEFAULT_PROFILE, age: 31 })
    await saveProfile(db, { ...DEFAULT_PROFILE, weight: 90 })
    expect((await getProfile(db)).weight).toBe(90)
  })
})

describe('diario', () => {
  it('agrega, edita y borra entradas', async () => {
    const db = await freshDb()
    const pollo = (await db.foods.get('b0'))!
    const e = await addEntry(db, D, 'comida', entryFromFood(pollo, 150))
    expect(await entriesOn(db, D)).toHaveLength(1)
    await updateEntry(db, e.id, { grams: 200, kcal: 330 })
    expect((await db.diary.get(e.id))?.kcal).toBe(330)
    await deleteEntry(db, e.id)
    expect(await entriesOn(db, D)).toHaveLength(0)
  })

  it('guarda alimentos recientes sin repetir y con tope de 25', async () => {
    const db = await freshDb()
    const foods = await db.foods.limit(30).toArray()
    for (const f of foods) await addEntry(db, D, 'snack', entryFromFood(f, 100))
    await addEntry(db, D, 'snack', entryFromFood(foods[3]!, 50))
    const recent = await getRecentFoodIds(db)
    expect(recent).toHaveLength(25)
    expect(recent[0]).toBe(foods[3]!.id)
    expect(new Set(recent).size).toBe(25)
  })
  it('un agregado rápido no es un alimento reciente', async () => {
    const db = await freshDb()
    await addEntry(db, D, 'snack', quickEntry({ kcal: 100 }))
    expect(await getRecentFoodIds(db)).toEqual([])
  })

  it('vaciar una comida no toca las demás ni otros días', async () => {
    const db = await freshDb()
    await addEntry(db, D, 'comida', quickEntry({ kcal: 1 }))
    await addEntry(db, D, 'cena', quickEntry({ kcal: 2 }))
    await addEntry(db, '2026-11-21', 'comida', quickEntry({ kcal: 3 }))
    await clearSlot(db, D, 'comida')
    expect((await entriesOn(db, D)).map((e) => e.slot)).toEqual(['cena'])
    expect(await entriesOn(db, '2026-11-21')).toHaveLength(1)
  })

  it('copiar el día de ayer (todo o una comida) crea entradas nuevas', async () => {
    const db = await freshDb()
    await addEntry(db, D, 'desayuno', quickEntry({ name: 'A', kcal: 100 }))
    await addEntry(db, D, 'cena', quickEntry({ name: 'B', kcal: 200 }))
    expect(await copyYesterday(db, '2026-11-21', 'desayuno')).toBe(1)
    expect(await copyYesterday(db, '2026-11-21')).toBe(2)
    const hoy = await entriesOn(db, '2026-11-21')
    expect(hoy).toHaveLength(3)
    expect(new Set(hoy.map((e) => e.id)).size).toBe(3)
    expect((await entriesOn(db, D)).every((e) => e.date === D)).toBe(true)
    expect(await copyEntries(db, '2000-01-01', D)).toBe(0)
  })
})

describe('agua', () => {
  it('suma, resta sin bajar de 0 y borra el día en 0', async () => {
    const db = await freshDb()
    expect(await getWater(db, D)).toBe(0)
    expect(await addWater(db, D, 250)).toBe(250)
    expect(await addWater(db, D, 250)).toBe(500)
    expect(await addWater(db, D, -1000)).toBe(0)
    expect(await db.water.count()).toBe(0)
  })
})

describe('alimentos propios y comidas guardadas', () => {
  it('crea un alimento propio y no deja borrar los del catálogo', async () => {
    const db = await freshDb()
    const f = await saveCustomFood(db, { name: 'Tamal', per100: { kcal: 190, p: 5, c: 24, f: 8 }, servings: [{ label: '1 tamal', grams: 150 }] })
    expect(f.source).toBe('custom')
    expect(f.id).toMatch(/^c/)
    await deleteCustomFood(db, 'b0')
    expect(await db.foods.get('b0')).toBeDefined()
    await deleteCustomFood(db, f.id)
    expect(await db.foods.get(f.id)).toBeUndefined()
  })

  it('guardar una comida y volver a usarla', async () => {
    const db = await freshDb()
    const pollo = (await db.foods.get('b0'))!
    await addEntry(db, D, 'comida', entryFromFood(pollo, 120))
    await addEntry(db, D, 'comida', quickEntry({ name: 'Salsa', kcal: 20 }))
    const meal = await saveMealFromSlot(db, D, 'comida', '  Comida de siempre ')
    expect(meal?.name).toBe('Comida de siempre')
    expect(meal?.entries).toHaveLength(2)
    expect(meal?.entries[0]).not.toHaveProperty('id')
    expect(meal?.entries[0]).not.toHaveProperty('date')
    expect(await saveMealFromSlot(db, D, 'cena', 'vacía')).toBeNull()

    await addMeal(db, meal!, '2026-11-22', 'cena')
    const cena = await entriesOn(db, '2026-11-22')
    expect(cena.map((e) => [e.slot, e.name, e.kcal])).toEqual([['cena', 'Pechuga de pollo cocida', 198], ['cena', 'Salsa', 20]])
  })
})
