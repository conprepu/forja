import { useLiveQuery } from 'dexie-react-hooks'
import { useCallback, useMemo } from 'react'
import { db } from '../../db/db'
import { getLbExercises, setExerciseUnit } from '../../db/prefs'
import type { Exercise } from '../../db/schema'
import type { WeightUnit } from '../../lib/units'

/** Catálogo completo por id; vacío mientras carga. */
export function useExerciseMap(): Map<string, Exercise> {
  const list = useLiveQuery(() => db.exercises.toArray(), [])
  return useMemo(() => new Map((list ?? []).map((e) => [e.id, e])), [list])
}

/** Peso×reps cuenta para el volumen; cardio y tiempo no. */
export const countsVolume = (ex: Exercise | undefined): boolean => !ex || ex.type === 'weight_reps'

/** Unidad de peso de cada ejercicio (kg por defecto; lb si lo marcaste). */
export function useUnits() {
  const list = useLiveQuery(() => getLbExercises(db), [])
  const lb = useMemo(() => new Set(list ?? []), [list])
  const unitOf = useCallback((exerciseId: string): WeightUnit => (lb.has(exerciseId) ? 'lb' : 'kg'), [lb])
  const setUnit = useCallback((exerciseId: string, unit: WeightUnit) => setExerciseUnit(db, exerciseId, unit), [])
  return { unitOf, setUnit }
}
