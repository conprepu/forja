import type { ExerciseType, PrKind, WorkoutSet } from '../db/schema'
import { epley } from './1rm'

export type Bests = Partial<Record<PrKind, number>>

export const PR_LABEL: Record<PrKind, string> = {
  weight: 'Peso máximo',
  e1rm: '1RM estimado',
  volume: 'Mejor volumen',
  reps: 'Más repeticiones',
}

type PrSet = Pick<WorkoutSet, 'type' | 'weight' | 'reps' | 'done'>

/**
 * Mejores marcas de un ejercicio en UN entreno. Ignora calentamientos y series sin hacer.
 * - Con carga: peso máximo, 1RM estimado (Epley) y volumen total del ejercicio.
 * - Sin carga (peso corporal): repeticiones máximas en una serie.
 * - Tiempo: la serie más larga (cuenta como "reps"). Distancia: sin marcas por ahora.
 */
export function computeBests(type: ExerciseType, sets: PrSet[]): Bests {
  const work = sets.filter((s) => s.done && s.type !== 'warmup' && s.reps > 0)
  if (!work.length || type === 'distance') return {}
  if (type === 'time') return { reps: Math.max(...work.map((s) => s.reps)) }
  const loaded = work.filter((s) => s.weight > 0)
  if (!loaded.length) return { reps: Math.max(...work.map((s) => s.reps)) }
  return {
    weight: Math.max(...loaded.map((s) => s.weight)),
    e1rm: Math.max(...loaded.map((s) => epley(s.weight, s.reps))),
    volume: loaded.reduce((v, s) => v + s.weight * s.reps, 0),
  }
}

/** Máximo por marca entre dos conjuntos. */
export function mergeBests(a: Bests, b: Bests): Bests {
  const out: Bests = { ...a }
  for (const k of Object.keys(b) as PrKind[]) {
    const v = b[k]!
    if (out[k] === undefined || v > out[k]!) out[k] = v
  }
  return out
}

/**
 * Marcas que se superaron. Sin historial previo no hay récord que romper (la primera vez no cuenta),
 * y una marca que antes no existía tampoco se premia.
 */
export function detectPrs(previous: Bests | null, now: Bests): PrKind[] {
  if (!previous) return []
  return (Object.keys(now) as PrKind[]).filter((k) => previous[k] !== undefined && now[k]! > previous[k]! + 1e-9)
}
