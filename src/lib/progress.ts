import type { Exercise, Workout, WorkoutSet } from '../db/schema'
import { addDays, localDate, startOfWeek } from './dates'
import { computeBests } from './prs'
import { workoutVolume } from './workout'

export interface ExercisePoint {
  workoutId: string
  date: string
  e1rm?: number
  weight?: number
  volume?: number
  reps?: number
}

const byStart = (a: Workout, b: Workout) => a.startedAt - b.startedAt

/** Mejores marcas del ejercicio en cada entreno en que apareció, de más viejo a más nuevo. */
export function exerciseSeries(workouts: Workout[], ex: Pick<Exercise, 'id' | 'type'>): ExercisePoint[] {
  const out: ExercisePoint[] = []
  for (const w of [...workouts].sort(byStart)) {
    const sets: WorkoutSet[] = w.items.filter((i) => i.exerciseId === ex.id).flatMap((i) => i.sets)
    if (!sets.length) continue
    const b = computeBests(ex.type, sets)
    if (Object.keys(b).length) out.push({ workoutId: w.id, date: localDate(w.startedAt), ...b })
  }
  return out
}

/** Cuántas veces se hizo cada ejercicio. */
export function exerciseCounts(workouts: Workout[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const w of workouts) for (const id of new Set(w.items.map((i) => i.exerciseId))) m.set(id, (m.get(id) ?? 0) + 1)
  return m
}

export interface PeriodSummary {
  workouts: number
  volume: number
  durationSec: number
  sets: number
}

const volumeOf = (w: Workout, countsVolume: (id: string) => boolean) =>
  workoutVolume(w.items.map((i) => ({ exerciseId: i.exerciseId, sets: i.sets })), countsVolume)

export function summarize(workouts: Workout[], countsVolume: (id: string) => boolean = () => true): PeriodSummary {
  return workouts.reduce<PeriodSummary>(
    (s, w) => ({
      workouts: s.workouts + 1,
      volume: s.volume + volumeOf(w, countsVolume),
      durationSec: s.durationSec + Math.max(0, Math.round((w.endedAt - w.startedAt) / 1000)),
      sets: s.sets + w.items.reduce((n, i) => n + i.sets.length, 0),
    }),
    { workouts: 0, volume: 0, durationSec: 0, sets: 0 },
  )
}

/** Entrenos cuya fecha local cae entre `from` y `to`, ambas incluidas. */
export const inRange = (workouts: Workout[], from: string, to: string): Workout[] =>
  workouts.filter((w) => {
    const d = localDate(w.startedAt)
    return d >= from && d <= to
  })

/** Volumen por semana (lunes) de las últimas `weeks` semanas hasta la de `endDate`. */
export function weeklyVolumes(workouts: Workout[], endDate: string, weeks: number, countsVolume: (id: string) => boolean = () => true) {
  const last = startOfWeek(endDate)
  return Array.from({ length: weeks }, (_, k) => {
    const weekStart = addDays(last, -7 * (weeks - 1 - k))
    const ws = inRange(workouts, weekStart, addDays(weekStart, 6))
    return { weekStart, volume: summarize(ws, countsVolume).volume, workouts: ws.length }
  })
}

/** Series de trabajo por músculo (sin calentamientos), de más a menos. */
export function muscleSets(workouts: Workout[], muscleOf: (exerciseId: string) => string | undefined): { muscle: string; sets: number }[] {
  const m = new Map<string, number>()
  for (const w of workouts) {
    for (const it of w.items) {
      const muscle = muscleOf(it.exerciseId)
      if (!muscle) continue
      const n = it.sets.filter((s) => s.type !== 'warmup').length
      if (n) m.set(muscle, (m.get(muscle) ?? 0) + n)
    }
  }
  return [...m].map(([muscle, sets]) => ({ muscle, sets })).sort((a, b) => b.sets - a.sets || a.muscle.localeCompare(b.muscle))
}

export function workoutsByDay(workouts: Workout[]): Map<string, Workout[]> {
  const m = new Map<string, Workout[]>()
  for (const w of [...workouts].sort(byStart)) {
    const d = localDate(w.startedAt)
    m.set(d, [...(m.get(d) ?? []), w])
  }
  return m
}

/** Máximo de cada marca a lo largo de la serie. */
export function seriesBests(points: ExercisePoint[]): Pick<ExercisePoint, 'e1rm' | 'weight' | 'volume' | 'reps'> {
  const out: Pick<ExercisePoint, 'e1rm' | 'weight' | 'volume' | 'reps'> = {}
  for (const p of points) {
    for (const k of ['e1rm', 'weight', 'volume', 'reps'] as const) {
      const v = p[k]
      if (v !== undefined && (out[k] === undefined || v > out[k]!)) out[k] = v
    }
  }
  return out
}
