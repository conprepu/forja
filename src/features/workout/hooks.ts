import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { db } from '../../db/db'
import type { Exercise } from '../../db/schema'

/** Catálogo completo por id; vacío mientras carga. */
export function useExerciseMap(): Map<string, Exercise> {
  const list = useLiveQuery(() => db.exercises.toArray(), [])
  return useMemo(() => new Map((list ?? []).map((e) => [e.id, e])), [list])
}

/** Peso×reps cuenta para el volumen; cardio y tiempo no. */
export const countsVolume = (ex: Exercise | undefined): boolean => !ex || ex.type === 'weight_reps'
