import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../db/db'
import type { Workout } from '../../db/schema'

/** Todo el historial, del más viejo al más nuevo. Vacío mientras carga. */
export function useWorkouts(): { workouts: Workout[]; loaded: boolean } {
  const list = useLiveQuery(() => db.workouts.orderBy('startedAt').toArray(), [])
  return { workouts: list ?? [], loaded: list !== undefined }
}
