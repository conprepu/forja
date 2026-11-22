import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo } from 'react'
import { db } from '../../db/db'
import { entriesOn, getGoals, getWater } from '../../db/nutrition'
import type { DiaryEntry, Food, Goals } from '../../db/schema'
import { DEFAULT_GOALS } from '../../lib/nutrition'

export function useDay(date: string): { entries: DiaryEntry[]; goals: Goals; waterMl: number } {
  const entries = useLiveQuery(() => entriesOn(db, date), [date])
  const goals = useLiveQuery(() => getGoals(db), [])
  const waterMl = useLiveQuery(() => getWater(db, date), [date])
  return { entries: entries ?? [], goals: goals ?? DEFAULT_GOALS, waterMl: waterMl ?? 0 }
}

/** Todos los alimentos por id (catálogo + propios + guardados de Open Food Facts). */
export function useFoodMap(): Map<string, Food> {
  const list = useLiveQuery(() => db.foods.toArray(), [])
  return useMemo(() => new Map((list ?? []).map((f) => [f.id, f])), [list])
}
