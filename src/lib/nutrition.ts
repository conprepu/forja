import type { DiarySlot, Food, FoodEntry, Goals, Macros, Profile, Recipe } from '../db/schema'
import { norm } from './text'

export const SLOTS: { slot: DiarySlot; label: string }[] = [
  { slot: 'desayuno', label: 'Desayuno' },
  { slot: 'comida', label: 'Comida' },
  { slot: 'cena', label: 'Cena' },
  { slot: 'snack', label: 'Snacks' },
]

/** Comida que toca según la hora: desayuno hasta las 11, comida hasta las 16, cena hasta las 22, si no snack. */
export function slotForHour(hour: number): DiarySlot {
  if (hour < 11) return 'desayuno'
  if (hour < 16) return 'comida'
  if (hour < 22) return 'cena'
  return 'snack'
}

export const ACTIVITY: [number, string][] = [
  [1.2, 'Sedentario'],
  [1.375, 'Ligero (1–3 días)'],
  [1.55, 'Moderado (3–5 días)'],
  [1.725, 'Alto (6–7 días)'],
  [1.9, 'Muy alto'],
]

export const GOAL_LABEL: Record<Profile['goal'], string> = { perder: 'Perder grasa', mant: 'Mantener', ganar: 'Ganar músculo' }

export const DEFAULT_PROFILE: Profile = { sex: 'm', age: 25, height: 175, weight: 75, act: 1.55, goal: 'mant' }
export const DEFAULT_GOALS: Goals = { kcal: 2400, p: 150, c: 270, f: 75, waterMl: 2000 }
export const ML_PER_GLASS = 250

export const r1 = (x: number): number => Math.round(x * 10) / 10

let seq = 0
/** Id de entrada del diario que ordena por hora de creación (para mostrarlas en el orden en que se agregaron). */
export function entryId(now = Date.now()): string {
  seq = (seq + 1) % 46656
  return now.toString(36).padStart(9, '0') + seq.toString(36).padStart(3, '0') + Math.random().toString(36).slice(2, 6)
}

export interface GoalSuggestion extends Macros {
  bmr: number
  tdee: number
}

/**
 * Metas sugeridas con Mifflin-St Jeor: BMR × actividad = TDEE; perder −20 %, ganar +10 %.
 * Proteína 2 g/kg (2.2 al perder), grasa 25 % de las kcal y el resto en carbohidratos.
 */
export function calcGoals(p: Profile): GoalSuggestion {
  const bmr = 10 * p.weight + 6.25 * p.height - 5 * p.age + (p.sex === 'm' ? 5 : -161)
  const tdee = bmr * p.act
  const factor = p.goal === 'perder' ? 0.8 : p.goal === 'ganar' ? 1.1 : 1
  const kcal = Math.round((tdee * factor) / 10) * 10
  const prot = Math.round(p.weight * (p.goal === 'perder' ? 2.2 : 2))
  const fat = Math.round((kcal * 0.25) / 9)
  const carb = Math.max(0, Math.round((kcal - prot * 4 - fat * 9) / 4))
  return { bmr: Math.round(bmr), tdee: Math.round(tdee), kcal, p: prot, c: carb, f: fat }
}

/** Macros de `grams` gramos de un alimento (por 100 g). */
export function macrosFor(per100: Macros, grams: number): Macros {
  const k = grams / 100
  return { kcal: Math.round(per100.kcal * k), p: r1(per100.p * k), c: r1(per100.c * k), f: r1(per100.f * k) }
}

export function entryFromFood(food: Food, grams: number): FoodEntry {
  return { name: food.name, foodId: food.id, grams, ...macrosFor(food.per100, grams) }
}

export function quickEntry(v: { name?: string; kcal: number; p?: number; c?: number; f?: number }): FoodEntry {
  return { name: v.name?.trim() || 'Agregado rápido', kcal: Math.round(v.kcal), p: r1(v.p ?? 0), c: r1(v.c ?? 0), f: r1(v.f ?? 0) }
}

export function sumMacros(entries: Macros[]): Macros {
  const t = entries.reduce((a, e) => ({ kcal: a.kcal + e.kcal, p: a.p + e.p, c: a.c + e.c, f: a.f + e.f }), { kcal: 0, p: 0, c: 0, f: 0 })
  return { kcal: Math.round(t.kcal), p: r1(t.p), c: r1(t.c), f: r1(t.f) }
}

/** Lo que falta para la meta (negativo si te pasaste). */
export const remaining = (goal: Macros, eaten: Macros): Macros => ({
  kcal: Math.round(goal.kcal - eaten.kcal),
  p: r1(goal.p - eaten.p),
  c: r1(goal.c - eaten.c),
  f: r1(goal.f - eaten.f),
})

/** Avance 0–1 hacia una meta (sin pasar de 1). */
export const progress = (value: number, goal: number): number => (goal > 0 ? Math.min(1, Math.max(0, value / goal)) : 0)

/** Kcal a partir de macros (Atwater) cuando una etiqueta no trae energía. */
export const kcalFromMacros = (m: Pick<Macros, 'p' | 'c' | 'f'>): number => Math.round(m.p * 4 + m.c * 4 + m.f * 9)

/** Filtra y ordena por nombre/marca (sin acentos): primero los que empiezan con la búsqueda, luego recientes. */
export function searchFoods(foods: Food[], query: string, recentIds: readonly string[] = []): Food[] {
  const q = norm(query.trim())
  const rank = new Map(recentIds.map((id, i) => [id, i]))
  const hay = (f: Food) => norm(`${f.name} ${f.brand ?? ''}`)
  const list = q ? foods.filter((f) => q.split(/\s+/).every((w) => hay(f).includes(w))) : [...foods]
  return list.sort((a, b) => {
    const sa = q && norm(a.name).startsWith(q) ? 0 : 1
    const sb = q && norm(b.name).startsWith(q) ? 0 : 1
    if (sa !== sb) return sa - sb
    const ra = rank.get(a.id) ?? Infinity
    const rb = rank.get(b.id) ?? Infinity
    if (ra !== rb) return ra - rb
    return a.name.localeCompare(b.name, 'es')
  })
}

export interface RecipeTotals {
  /** Macros de toda la receta. */
  total: Macros
  perServing: Macros
  grams: number
  /** Ingredientes cuyo alimento ya no existe. */
  missing: string[]
}

/** Suma de ingredientes ÷ porciones. */
export function recipeTotals(recipe: Pick<Recipe, 'servings' | 'ingredients'>, foods: ReadonlyMap<string, Food>): RecipeTotals {
  const parts: Macros[] = []
  const missing: string[] = []
  let grams = 0
  for (const ing of recipe.ingredients) {
    const f = foods.get(ing.foodId)
    if (!f) {
      missing.push(ing.foodId)
      continue
    }
    grams += ing.grams
    parts.push(macrosFor(f.per100, ing.grams))
  }
  const total = sumMacros(parts)
  const n = Math.max(1, recipe.servings)
  return { total, perServing: { kcal: Math.round(total.kcal / n), p: r1(total.p / n), c: r1(total.c / n), f: r1(total.f / n) }, grams, missing }
}

export function entryFromRecipe(recipe: Recipe, foods: ReadonlyMap<string, Food>, servings: number): FoodEntry {
  const { perServing } = recipeTotals(recipe, foods)
  return {
    name: recipe.name,
    recipeId: recipe.id,
    kcal: Math.round(perServing.kcal * servings),
    p: r1(perServing.p * servings),
    c: r1(perServing.c * servings),
    f: r1(perServing.f * servings),
  }
}
