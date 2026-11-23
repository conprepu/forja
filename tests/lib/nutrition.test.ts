import { describe, expect, it } from 'vitest'
import type { Food, Profile } from '../../src/db/schema'
import {
  calcGoals,
  entryFromFood,
  entryFromRecipe,
  kcalFromMacros,
  macrosFor,
  progress,
  quickEntry,
  recipeTotals,
  remaining,
  searchFoods,
  slotForHour,
  sumMacros,
} from '../../src/lib/nutrition'

describe('slotForHour', () => {
  it('elige la comida según la hora', () => {
    expect(slotForHour(7)).toBe('desayuno')
    expect(slotForHour(13)).toBe('comida')
    expect(slotForHour(19)).toBe('cena')
    expect(slotForHour(23)).toBe('snack')
  })
})

const food = (id: string, name: string, kcal: number, p: number, c: number, f: number, extra: Partial<Food> = {}): Food => ({
  id, name, per100: { kcal, p, c, f }, servings: [], source: 'local', ...extra,
})

describe('calcGoals (Mifflin-St Jeor)', () => {
  const base: Profile = { sex: 'm', age: 30, height: 180, weight: 80, act: 1.55, goal: 'mant' }
  it('hombre, mantenimiento', () => {
    // BMR = 800 + 1125 − 150 + 5 = 1780; TDEE = 1780 × 1.55 = 2759
    const g = calcGoals(base)
    expect(g.bmr).toBe(1780)
    expect(g.tdee).toBe(2759)
    expect(g.kcal).toBe(2760)
    expect(g.p).toBe(160) // 2 g/kg
    expect(g.f).toBe(77) // 25 % de kcal
    expect(g.c).toBe(Math.round((2760 - 160 * 4 - 77 * 9) / 4))
  })
  it('mujer usa −161', () => {
    expect(calcGoals({ ...base, sex: 'f' }).bmr).toBe(1614)
  })
  it('perder: −20 % de kcal y 2.2 g/kg de proteína; ganar: +10 %', () => {
    const perder = calcGoals({ ...base, goal: 'perder' })
    expect(perder.kcal).toBe(2210)
    expect(perder.p).toBe(176)
    expect(calcGoals({ ...base, goal: 'ganar' }).kcal).toBe(3030)
  })
  it('las kcal de los macros suman las kcal meta (±10 por redondeo)', () => {
    for (const goal of ['perder', 'mant', 'ganar'] as const) {
      const g = calcGoals({ ...base, goal })
      expect(Math.abs(g.p * 4 + g.c * 4 + g.f * 9 - g.kcal)).toBeLessThanOrEqual(10)
    }
  })
  it('nunca da carbohidratos negativos', () => {
    expect(calcGoals({ sex: 'f', age: 60, height: 150, weight: 200, act: 1.2, goal: 'perder' }).c).toBeGreaterThanOrEqual(0)
  })
})

describe('macros', () => {
  const pollo = food('b0', 'Pechuga de pollo cocida', 165, 31, 0, 3.6)
  it('macrosFor escala por gramos', () => {
    expect(macrosFor(pollo.per100, 120)).toEqual({ kcal: 198, p: 37.2, c: 0, f: 4.3 })
    expect(macrosFor(pollo.per100, 0)).toEqual({ kcal: 0, p: 0, c: 0, f: 0 })
  })
  it('entryFromFood guarda el snapshot', () => {
    expect(entryFromFood(pollo, 100)).toEqual({ name: 'Pechuga de pollo cocida', foodId: 'b0', grams: 100, kcal: 165, p: 31, c: 0, f: 3.6 })
  })
  it('quickEntry: nombre por defecto y redondeo', () => {
    expect(quickEntry({ kcal: 150.4, p: 3.04 })).toEqual({ name: 'Agregado rápido', kcal: 150, p: 3, c: 0, f: 0 })
    expect(quickEntry({ name: ' Barra ', kcal: 200 }).name).toBe('Barra')
  })
  it('sumMacros evita acumular error de decimales', () => {
    const t = sumMacros(Array.from({ length: 10 }, () => ({ kcal: 10.4, p: 0.1, c: 0.2, f: 0.3 })))
    expect(t).toEqual({ kcal: 104, p: 1, c: 2, f: 3 })
    expect(sumMacros([])).toEqual({ kcal: 0, p: 0, c: 0, f: 0 })
  })
  it('remaining puede ser negativo', () => {
    expect(remaining({ kcal: 2000, p: 150, c: 200, f: 60 }, { kcal: 2300, p: 100, c: 250, f: 60 })).toEqual({ kcal: -300, p: 50, c: -50, f: 0 })
  })
  it('progress se limita a 0–1 y tolera meta 0', () => {
    expect(progress(50, 200)).toBe(0.25)
    expect(progress(500, 200)).toBe(1)
    expect(progress(-5, 200)).toBe(0)
    expect(progress(10, 0)).toBe(0)
  })
  it('kcalFromMacros (Atwater)', () => {
    expect(kcalFromMacros({ p: 10, c: 20, f: 5 })).toBe(165)
  })
})

describe('searchFoods', () => {
  const foods = [
    food('1', 'Pollo asado', 1, 1, 1, 1),
    food('2', 'Arroz con pollo', 1, 1, 1, 1),
    food('3', 'Tortilla de maíz', 1, 1, 1, 1),
    food('4', 'Yogur natural', 1, 1, 1, 1, { brand: 'Alpura' }),
    food('5', 'Pechuga de pollo', 1, 1, 1, 1),
  ]
  it('ignora acentos y mayúsculas', () => {
    expect(searchFoods(foods, 'MAIZ').map((f) => f.id)).toEqual(['3'])
    expect(searchFoods(foods, 'maíz').map((f) => f.id)).toEqual(['3'])
  })
  it('busca por varias palabras y por marca', () => {
    expect(searchFoods(foods, 'pollo arroz').map((f) => f.id)).toEqual(['2'])
    expect(searchFoods(foods, 'alpura').map((f) => f.id)).toEqual(['4'])
  })
  it('primero los que empiezan con lo escrito, luego recientes, luego alfabético', () => {
    expect(searchFoods(foods, 'pollo').map((f) => f.id)).toEqual(['1', '2', '5'])
    expect(searchFoods(foods, 'pollo', ['5']).map((f) => f.id)).toEqual(['1', '5', '2'])
    expect(searchFoods(foods, '', ['4', '3']).map((f) => f.id).slice(0, 2)).toEqual(['4', '3'])
  })
  it('sin resultados', () => {
    expect(searchFoods(foods, 'zzz')).toEqual([])
  })
})

describe('recetas', () => {
  const foods = new Map([
    ['arroz', food('arroz', 'Arroz', 130, 2.7, 28, 0.3)],
    ['pollo', food('pollo', 'Pollo', 165, 31, 0, 3.6)],
  ])
  const receta = { servings: 2, ingredients: [{ foodId: 'arroz', grams: 300 }, { foodId: 'pollo', grams: 200 }] }
  it('suma ingredientes ÷ porciones', () => {
    const r = recipeTotals(receta, foods)
    expect(r.total).toEqual({ kcal: 720, p: 70.1, c: 84, f: 8.1 })
    expect(r.perServing).toEqual({ kcal: 360, p: 35.1, c: 42, f: 4.1 })
    expect(r.grams).toBe(500)
    expect(r.missing).toEqual([])
  })
  it('ignora ingredientes borrados y los reporta', () => {
    const r = recipeTotals({ servings: 1, ingredients: [...receta.ingredients, { foodId: 'x', grams: 100 }] }, foods)
    expect(r.missing).toEqual(['x'])
    expect(r.total.kcal).toBe(720)
  })
  it('porciones inválidas cuentan como 1', () => {
    expect(recipeTotals({ ...receta, servings: 0 }, foods).perServing.kcal).toBe(720)
  })
  it('entryFromRecipe multiplica por porciones consumidas', () => {
    const e = entryFromRecipe({ id: 'r1', name: 'Bowl', ...receta }, foods, 1.5)
    expect(e).toEqual({ name: 'Bowl', recipeId: 'r1', kcal: 540, p: 52.7, c: 63, f: 6.1 })
  })
})
