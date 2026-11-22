import type { Goals, Macros, Routine, Workout } from '../db/schema'
import { addDays, localDate, startOfWeek } from './dates'

/** Rutina que toca: la que lleva más tiempo sin usarse (las nunca usadas van primero, por orden). */
export function suggestRoutine(routines: readonly Routine[]): Routine | undefined {
  return [...routines].sort((a, b) => (a.lastUsedAt ?? 0) - (b.lastUsedAt ?? 0) || a.order - b.order)[0]
}

/** Días distintos con entreno desde el lunes de la semana de `date`. */
export function weekWorkoutDays(workouts: readonly Pick<Workout, 'startedAt'>[], date: string): number {
  const from = startOfWeek(date)
  return new Set(workouts.map((w) => localDate(w.startedAt)).filter((d) => d >= from && d <= date)).size
}

export interface DayTotal extends Macros {
  date: string
  /** false = ese día no registraste comida (no cuenta como 0 kcal en los promedios). */
  logged: boolean
}

type Dated = Macros & { date: string }

/** Totales por día de los últimos `days` días que terminan en `endDate`, del más viejo al más nuevo. */
export function dailyTotals(entries: readonly Dated[], endDate: string, days: number): DayTotal[] {
  const byDate = new Map<string, DayTotal>()
  for (let i = days - 1; i >= 0; i--) {
    const date = addDays(endDate, -i)
    byDate.set(date, { date, kcal: 0, p: 0, c: 0, f: 0, logged: false })
  }
  for (const e of entries) {
    const d = byDate.get(e.date)
    if (!d) continue
    d.kcal += e.kcal
    d.p += e.p
    d.c += e.c
    d.f += e.f
    d.logged = true
  }
  return [...byDate.values()].map((d) => ({ ...d, kcal: Math.round(d.kcal), p: Math.round(d.p), c: Math.round(d.c), f: Math.round(d.f) }))
}

export interface NutritionTrend {
  /** Días con comida registrada. */
  loggedDays: number
  /** Promedios de los días registrados. */
  avg: Macros
  /** Días registrados con calorías dentro de ±10 % de la meta. */
  onTargetDays: number
  /** Días registrados en que llegaste a la proteína (≥ 90 % de la meta). */
  proteinDays: number
}

export function nutritionTrend(totals: readonly DayTotal[], goals: Pick<Goals, 'kcal' | 'p'>): NutritionTrend {
  const logged = totals.filter((d) => d.logged)
  const n = logged.length
  const mean = (pick: (d: DayTotal) => number) => (n ? Math.round(logged.reduce((s, d) => s + pick(d), 0) / n) : 0)
  return {
    loggedDays: n,
    avg: { kcal: mean((d) => d.kcal), p: mean((d) => d.p), c: mean((d) => d.c), f: mean((d) => d.f) },
    onTargetDays: logged.filter((d) => goals.kcal > 0 && Math.abs(d.kcal - goals.kcal) <= goals.kcal * 0.1).length,
    proteinDays: logged.filter((d) => goals.p > 0 && d.p >= goals.p * 0.9).length,
  }
}

/** Saludo según la hora local. */
export function greeting(hour: number): string {
  if (hour < 6) return 'Buenas noches'
  if (hour < 12) return 'Buenos días'
  if (hour < 19) return 'Buenas tardes'
  return 'Buenas noches'
}
