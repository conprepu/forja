import type {
  ActiveItem,
  ActiveSet,
  ActiveWorkout,
  Routine,
  RoutineItem,
  SetType,
  Workout,
  WorkoutSet,
} from '../db/schema'

export const DEFAULT_REST_SEC = 90
export const SET_TYPES: readonly SetType[] = ['normal', 'warmup', 'drop', 'failure']
export const SET_TYPE_NAME: Record<SetType, string> = {
  normal: 'Normal',
  warmup: 'Calentamiento',
  drop: 'Drop set',
  failure: 'Al fallo',
}
const SET_TYPE_LETTER: Record<SetType, string> = { normal: '', warmup: 'C', drop: 'D', failure: 'F' }

export function newId(): string {
  return globalThis.crypto?.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2, 9)
}

export const blankSet = (type: SetType = 'normal', extra: Partial<ActiveSet> = {}): ActiveSet => ({
  type,
  weight: null,
  reps: null,
  done: false,
  ...extra,
})

export function emptyActive(now: number, name = 'Entrenamiento'): ActiveWorkout {
  return { id: 'current', workoutId: newId(), name, startedAt: now, items: [], restEndsAt: null, restTotalSec: null }
}

export function activeFromRoutine(r: Routine, now: number, defaultRest = DEFAULT_REST_SEC): ActiveWorkout {
  return {
    ...emptyActive(now, r.name),
    routineId: r.id,
    items: r.items.map((it) => ({
      exerciseId: it.exerciseId,
      restSec: it.restSec ?? defaultRest,
      ...(it.supersetId ? { supersetId: it.supersetId } : {}),
      ...(it.note ? { note: it.note } : {}),
      sets: (it.sets.length ? it.sets : [{ type: 'normal' as const }]).map((s) =>
        blankSet(s.type, {
          ...(s.targetReps ? { targetReps: s.targetReps } : {}),
          ...(s.targetWeight != null ? { targetWeight: s.targetWeight } : {}),
        }),
      ),
    })),
  }
}

/** Repetir un entreno anterior: mismos ejercicios y tipos de serie, valores vacíos. */
export function activeFromWorkout(w: Workout, now: number, defaultRest = DEFAULT_REST_SEC): ActiveWorkout {
  return {
    ...emptyActive(now, w.name),
    ...(w.routineId ? { routineId: w.routineId } : {}),
    items: w.items.map((it) => ({
      exerciseId: it.exerciseId,
      restSec: it.restSec ?? defaultRest,
      ...(it.supersetId ? { supersetId: it.supersetId } : {}),
      sets: it.sets.map((s) => blankSet(s.type)),
    })),
  }
}

/** Entreno terminado → rutina: sin calentamientos, con la mayor cantidad de reps como meta. */
export function routineItemsFromWorkout(w: Workout, defaultRest = DEFAULT_REST_SEC): RoutineItem[] {
  return w.items.map((it) => {
    const work = it.sets.filter((s) => s.type !== 'warmup')
    const sets = work.length ? work : it.sets
    const reps = Math.max(0, ...sets.map((s) => s.reps))
    return {
      exerciseId: it.exerciseId,
      restSec: it.restSec ?? defaultRest,
      ...(it.supersetId ? { supersetId: it.supersetId } : {}),
      sets: sets.map(() => ({ type: 'normal' as const, ...(reps > 0 ? { targetReps: String(reps) } : {}) })),
    }
  })
}

/** Etiqueta de la serie: número para las normales, letra para calentamiento (C), drop (D) y fallo (F). */
export function setLabel(sets: { type: SetType }[], index: number): string {
  const type = sets[index]?.type ?? 'normal'
  if (type !== 'normal') return SET_TYPE_LETTER[type]
  let n = 0
  for (let i = 0; i <= index; i++) if (sets[i]?.type === 'normal') n++
  return String(n)
}

type VolumeSet = { type: SetType; weight: number | null; reps: number | null; done: boolean }

/** Volumen = Σ kg × reps de las series hechas. Los calentamientos no cuentan. */
export function workoutVolume(
  items: { exerciseId?: string; sets: VolumeSet[] }[],
  countsVolume: (exerciseId: string) => boolean = () => true,
): number {
  let v = 0
  for (const it of items) {
    if (it.exerciseId && !countsVolume(it.exerciseId)) continue
    for (const s of it.sets) if (s.done && s.type !== 'warmup') v += (s.weight ?? 0) * (s.reps ?? 0)
  }
  return v
}

export const doneSetCount = (items: { sets: { done: boolean }[] }[]): number =>
  items.reduce((n, it) => n + it.sets.filter((s) => s.done).length, 0)

/** Primer número de una meta: "8-12" → 8, "10" → 10. */
export function repsFromTarget(target: string | undefined): number | null {
  const m = target?.match(/\d+/)
  return m ? Number(m[0]) : null
}

/** Convierte el entreno en curso en uno terminado: solo series hechas, sin ejercicios vacíos. */
export function finishActive(a: ActiveWorkout, now: number): Workout | null {
  const items = a.items
    .map((it) => ({
      exerciseId: it.exerciseId,
      ...(it.supersetId ? { supersetId: it.supersetId } : {}),
      ...(it.restSec != null ? { restSec: it.restSec } : {}),
      ...(it.note ? { note: it.note } : {}),
      sets: it.sets
        .filter((s) => s.done)
        .map(
          (s): WorkoutSet => ({
            type: s.type,
            weight: s.weight ?? 0,
            reps: s.reps ?? 0,
            ...(s.rpe != null ? { rpe: s.rpe } : {}),
            done: true,
          }),
        ),
    }))
    .filter((it) => it.sets.length > 0)
  if (!items.length) return null
  return {
    id: a.workoutId,
    ...(a.routineId ? { routineId: a.routineId } : {}),
    name: a.name.trim() || 'Entrenamiento',
    startedAt: a.startedAt,
    endedAt: Math.max(now, a.startedAt),
    note: '',
    items: normalizeSupersets(items),
  }
}

// ---------- superseries ----------

type WithSuperset = { supersetId?: string }

/** Una superserie son ejercicios consecutivos con el mismo id; las rachas de uno solo se limpian. */
export function normalizeSupersets<T extends WithSuperset>(items: T[]): T[] {
  const used = new Set<string>()
  const out: T[] = []
  let i = 0
  while (i < items.length) {
    const id = items[i]!.supersetId
    let j = i
    if (id) while (j + 1 < items.length && items[j + 1]!.supersetId === id) j++
    const keep = id !== undefined && j > i
    const runId = keep ? (used.has(id) ? newId() : id) : undefined
    if (runId) used.add(runId)
    for (let k = i; k <= j; k++) {
      const { supersetId: _drop, ...rest } = items[k]!
      out.push((runId ? { ...rest, supersetId: runId } : rest) as T)
    }
    i = j + 1
  }
  return out
}

/** Une el ejercicio i con el siguiente (y con sus grupos, si ya estaban en superserie). */
export function linkWithNext<T extends WithSuperset>(items: T[], i: number): T[] {
  const a = items[i]
  const b = items[i + 1]
  if (!a || !b) return items
  const id = a.supersetId ?? b.supersetId ?? newId()
  const old = new Set([a.supersetId, b.supersetId].filter((x): x is string => !!x))
  return normalizeSupersets(
    items.map((it, k) => (k === i || k === i + 1 || (it.supersetId && old.has(it.supersetId)) ? { ...it, supersetId: id } : it)),
  )
}

export function unlinkAt<T extends WithSuperset>(items: T[], i: number): T[] {
  return normalizeSupersets(
    items.map((it, k) => {
      if (k !== i) return it
      const { supersetId: _drop, ...rest } = it
      return rest as T
    }),
  )
}

export function moveItem<T extends WithSuperset>(items: T[], i: number, dir: -1 | 1): T[] {
  const j = i + dir
  if (j < 0 || j >= items.length) return items
  const next = [...items]
  ;[next[i], next[j]] = [next[j]!, next[i]!]
  return normalizeSupersets(next)
}

/** El descanso arranca al terminar la serie del último ejercicio de la superserie (o de uno suelto). */
export function isLastOfSuperset(items: WithSuperset[], i: number): boolean {
  const id = items[i]?.supersetId
  return !id || items[i + 1]?.supersetId !== id
}

/** "A", "B"… según el orden de aparición de la superserie; null si el ejercicio no está en una. */
export function supersetLetter(items: WithSuperset[], i: number): string | null {
  const id = items[i]?.supersetId
  if (!id) return null
  const ids: string[] = []
  for (const it of items) if (it.supersetId && !ids.includes(it.supersetId)) ids.push(it.supersetId)
  return String.fromCharCode(65 + ids.indexOf(id))
}

export const shouldStartRest = (items: ActiveItem[], i: number, type: SetType): boolean =>
  type !== 'warmup' && isLastOfSuperset(items, i)
