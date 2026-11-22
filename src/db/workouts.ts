// Operaciones de base para rutinas, carpetas, entreno en curso e historial.
import { computeBests, detectPrs, mergeBests, type Bests } from '../lib/prs'
import { DEFAULT_REST_SEC, finishActive as finishActivePure, newId, workoutVolume } from '../lib/workout'
import type { ForjaDB } from './db'
import type {
  ActiveWorkout,
  Exercise,
  Folder,
  PrKind,
  Routine,
  RoutineItem,
  Workout,
  WorkoutSet,
} from './schema'

// ---------- ajustes ----------

export async function getSetting<T>(db: ForjaDB, key: string, fallback: T): Promise<T> {
  const row = await db.settings.get(key)
  return row ? (row.value as T) : fallback
}

export const setSetting = (db: ForjaDB, key: string, value: unknown) => db.settings.put({ key, value })

export async function getRestDefault(db: ForjaDB): Promise<number> {
  const v = await getSetting<unknown>(db, 'restSec', DEFAULT_REST_SEC)
  return typeof v === 'number' && v >= 0 ? v : DEFAULT_REST_SEC
}

// ---------- carpetas ----------

export async function createFolder(db: ForjaDB, name: string): Promise<Folder> {
  const last = await db.folders.orderBy('order').last()
  const folder: Folder = { id: newId(), name: name.trim() || 'Carpeta', order: (last?.order ?? -1) + 1 }
  await db.folders.put(folder)
  return folder
}

export const renameFolder = (db: ForjaDB, id: string, name: string) =>
  db.folders.update(id, { name: name.trim() || 'Carpeta' })

/** Borrar una carpeta no borra sus rutinas: pasan a "sin carpeta". */
export async function deleteFolder(db: ForjaDB, id: string): Promise<void> {
  await db.transaction('rw', db.folders, db.routines, async () => {
    const inside = await db.routines.where('folderId').equals(id).toArray()
    await db.routines.bulkPut(inside.map(({ folderId: _drop, ...r }) => r))
    await db.folders.delete(id)
  })
}

// ---------- rutinas ----------

export async function createRoutine(
  db: ForjaDB,
  data: { name: string; items: RoutineItem[]; folderId?: string },
): Promise<Routine> {
  const last = await db.routines.orderBy('order').last()
  const routine: Routine = {
    id: newId(),
    name: data.name.trim() || 'Rutina',
    order: (last?.order ?? -1) + 1,
    items: data.items,
    ...(data.folderId ? { folderId: data.folderId } : {}),
  }
  await db.routines.put(routine)
  return routine
}

export const saveRoutine = (db: ForjaDB, routine: Routine) => db.routines.put(routine)

export const deleteRoutine = (db: ForjaDB, id: string) => db.routines.delete(id)

/** Reasigna `order` 0..n-1 siguiendo la lista dada. */
async function renumber(db: ForjaDB, ordered: Routine[]): Promise<void> {
  await db.routines.bulkPut(ordered.map((r, i) => ({ ...r, order: i })))
}

export async function duplicateRoutine(db: ForjaDB, id: string): Promise<Routine | undefined> {
  return db.transaction('rw', db.routines, async () => {
    const all = await db.routines.orderBy('order').toArray()
    const i = all.findIndex((r) => r.id === id)
    const src = all[i]
    if (!src) return undefined
    const copy: Routine = { ...src, id: newId(), name: `${src.name} (copia)`, order: 0 }
    delete copy.lastUsedAt
    all.splice(i + 1, 0, copy)
    await renumber(db, all)
    return { ...copy, order: i + 1 }
  })
}

/** Sube o baja una rutina entre las de su misma carpeta. */
export async function moveRoutine(db: ForjaDB, id: string, dir: -1 | 1): Promise<void> {
  await db.transaction('rw', db.routines, async () => {
    const all = await db.routines.orderBy('order').toArray()
    const me = all.find((r) => r.id === id)
    if (!me) return
    const siblings = all.filter((r) => r.folderId === me.folderId)
    const k = siblings.findIndex((r) => r.id === id)
    const other = siblings[k + dir]
    if (!other) return
    const a = all.indexOf(me)
    const b = all.indexOf(other)
    ;[all[a], all[b]] = [all[b]!, all[a]!]
    await renumber(db, all)
  })
}

export async function setRoutineFolder(db: ForjaDB, id: string, folderId: string | undefined): Promise<void> {
  const r = await db.routines.get(id)
  if (!r) return
  const { folderId: _drop, ...rest } = r
  await db.routines.put(folderId ? { ...rest, folderId } : rest)
}

export async function createRoutineFromWorkout(db: ForjaDB, workout: Workout, items: RoutineItem[]): Promise<Routine> {
  return createRoutine(db, { name: workout.name, items })
}

/** Ejemplo Push / Pull / Pierna con ejercicios del catálogo base. */
export function sampleRoutineData(): { name: string; items: RoutineItem[] }[] {
  const mk = (name: string, rows: [string, number, string][]) => ({
    name,
    items: rows.map(([exerciseId, sets, reps]): RoutineItem => ({
      exerciseId,
      restSec: ['squat', 'dl', 'bench'].includes(exerciseId) ? 150 : 90,
      sets: Array.from({ length: sets }, () => ({ type: 'normal' as const, targetReps: reps })),
    })),
  })
  return [
    mk('Push', [['bench', 4, '5-8'], ['dbi', 3, '8-12'], ['ohp', 3, '6-10'], ['lra', 3, '12-15'], ['tpush', 3, '10-12']]),
    mk('Pull', [['pull', 4, '6-10'], ['brow', 3, '8-10'], ['lat', 3, '10-12'], ['face', 3, '15'], ['bcurl', 3, '8-12'], ['ham', 2, '10-12']]),
    mk('Pierna', [['squat', 4, '5-8'], ['rdl', 3, '8-10'], ['lp', 3, '10-12'], ['lcurl', 3, '10-12'], ['calf', 4, '12-15']]),
  ]
}

export async function addSampleRoutines(db: ForjaDB): Promise<void> {
  for (const r of sampleRoutineData()) await createRoutine(db, r)
}

// ---------- entreno en curso ----------

export const loadActive = (db: ForjaDB) => db.activeWorkout.get('current')
export const saveActive = (db: ForjaDB, a: ActiveWorkout) => db.activeWorkout.put(a)
export const clearActive = (db: ForjaDB) => db.activeWorkout.delete('current')

// ---------- historial ----------

export const recentWorkouts = (db: ForjaDB, limit = 3) => db.workouts.orderBy('startedAt').reverse().limit(limit).toArray()

/** Series de la última vez que se hizo el ejercicio (columna "Anterior"). */
export async function previousSets(
  db: ForjaDB,
  exerciseId: string,
  excludeWorkoutId?: string,
): Promise<WorkoutSet[] | null> {
  const w = await db.workouts
    .orderBy('startedAt')
    .reverse()
    .filter((x) => x.id !== excludeWorkoutId && x.items.some((i) => i.exerciseId === exerciseId))
    .first()
  return w?.items.find((i) => i.exerciseId === exerciseId)?.sets ?? null
}

export async function deleteWorkout(db: ForjaDB, id: string): Promise<void> {
  await db.transaction('rw', db.workouts, db.prs, async () => {
    await db.workouts.delete(id)
    await db.prs.filter((p) => p.workoutId === id).delete()
  })
}

// ---------- terminar entreno ----------

export interface NewPr {
  exerciseId: string
  exerciseName: string
  kind: PrKind
  value: number
}

export interface FinishResult {
  workout: Workout
  prs: NewPr[]
  durationSec: number
  volume: number
  sets: number
}

/** Une las series de un ejercicio que aparece más de una vez en el mismo entreno. */
function setsByExercise(w: Workout): Map<string, WorkoutSet[]> {
  const m = new Map<string, WorkoutSet[]>()
  for (const it of w.items) m.set(it.exerciseId, [...(m.get(it.exerciseId) ?? []), ...it.sets])
  return m
}

/**
 * Guarda el entreno, detecta récords contra TODO el historial anterior y limpia el entreno en curso,
 * todo en una transacción. Devuelve null (sin tocar nada) si no hay ninguna serie hecha.
 */
export async function finishWorkout(db: ForjaDB, active: ActiveWorkout, now = Date.now()): Promise<FinishResult | null> {
  const workout = finishActivePure(active, now)
  if (!workout) return null

  return db.transaction('rw', [db.workouts, db.prs, db.routines, db.activeWorkout, db.exercises], async () => {
    const past = (await db.workouts.toArray()).filter((w) => w.id !== workout.id)
    const date = new Date(workout.startedAt).toLocaleDateString('sv-SE')
    const prs: NewPr[] = []
    const exercises = new Map<string, Exercise | undefined>()

    for (const [exerciseId, sets] of setsByExercise(workout)) {
      const ex = await db.exercises.get(exerciseId)
      exercises.set(exerciseId, ex)
      const type = ex?.type ?? 'weight_reps'
      let previous: Bests | null = null
      for (const w of past) {
        const old = setsByExercise(w).get(exerciseId)
        if (old) previous = mergeBests(previous ?? {}, computeBests(type, old))
      }
      const now_ = computeBests(type, sets)
      for (const kind of detectPrs(previous, now_)) {
        prs.push({ exerciseId, exerciseName: ex?.name ?? exerciseId, kind, value: now_[kind]! })
      }
    }

    await db.workouts.put(workout)
    await db.prs.bulkPut(
      prs.map((p) => ({ id: `${workout.id}:${p.exerciseId}:${p.kind}`, exerciseId: p.exerciseId, kind: p.kind, value: p.value, workoutId: workout.id, date })),
    )
    if (workout.routineId) await db.routines.update(workout.routineId, { lastUsedAt: now })
    await db.activeWorkout.delete('current')

    return {
      workout,
      prs,
      durationSec: Math.round((workout.endedAt - workout.startedAt) / 1000),
      volume: workoutVolume(
        workout.items.map((i) => ({ exerciseId: i.exerciseId, sets: i.sets })),
        (id) => {
          const t = exercises.get(id)?.type
          return t === undefined || t === 'weight_reps'
        },
      ),
      sets: workout.items.reduce((n, i) => n + i.sets.length, 0),
    }
  })
}
