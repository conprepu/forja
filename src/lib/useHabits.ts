import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import type { Habit, ID } from '../db/types'

export type HabitsData = { habits: Habit[]; logs: Map<ID, Set<string>> }

/** Hábitos activos ordenados y sus fechas completadas, agrupadas por hábito. */
export function useHabits(): HabitsData | undefined {
  return useLiveQuery(async () => {
    const [habits, allLogs] = await Promise.all([db.habits.orderBy('order').toArray(), db.habitLogs.toArray()])
    const logs = new Map<ID, Set<string>>()
    for (const l of allLogs) {
      let s = logs.get(l.habitId)
      if (!s) logs.set(l.habitId, (s = new Set()))
      s.add(l.date)
    }
    return { habits: habits.filter((h) => !h.archivedAt), logs }
  }, [])
}

export const EMPTY_SET: ReadonlySet<string> = new Set()
