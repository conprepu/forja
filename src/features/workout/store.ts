import { create } from 'zustand'
import { db as appDb, type ForjaDB } from '../../db/db'
import type { ActiveItem, ActiveSet, ActiveWorkout, Routine, SetType, Workout, WorkoutSet } from '../../db/schema'
import {
  clearActive,
  finishWorkout,
  getRestDefault,
  getSetting,
  loadActive,
  previousSets,
  saveActive,
  setSetting,
  type FinishResult,
} from '../../db/workouts'
import {
  activeFromRoutine,
  activeFromWorkout,
  blankSet,
  DEFAULT_REST_SEC,
  emptyActive,
  linkWithNext,
  moveItem,
  normalizeSupersets,
  repsFromTarget,
  shouldStartRest,
  unlinkAt,
} from '../../lib/workout'

export type ToggleResult = 'done' | 'undone' | 'missing-reps'

export interface WorkoutState {
  ready: boolean
  active: ActiveWorkout | null
  /** Series de la última vez de cada ejercicio (columna "Anterior"). */
  prev: Record<string, WorkoutSet[]>
  restDefault: number
  showRpe: boolean

  hydrate(): Promise<void>
  startEmpty(): void
  startFromRoutine(r: Routine): void
  startFromWorkout(w: Workout): void
  rename(name: string): void

  addExercises(ids: string[]): void
  removeExercise(i: number): void
  moveExercise(i: number, dir: -1 | 1): void
  linkNext(i: number): void
  unlink(i: number): void
  setNote(i: number, note: string): void
  setRest(i: number, sec: number): void

  addSet(i: number): void
  insertWarmups(i: number, sets: { kg: number; reps: number }[]): void
  removeSet(i: number, j: number): void
  setSetType(i: number, j: number, type: SetType): void
  updateSet(i: number, j: number, patch: Partial<Pick<ActiveSet, 'weight' | 'reps' | 'rpe'>>): void
  /** Copia los valores de "Anterior" a la serie sin marcarla. */
  copyPrev(i: number, j: number): void
  toggleDone(i: number, j: number): ToggleResult

  startRest(sec: number): void
  adjustRest(deltaSec: number): void
  /** Termina el descanso (acabó o se saltó). */
  endRest(): void

  setShowRpe(v: boolean): void
  finish(): Promise<FinishResult | null>
  discard(): Promise<void>
  /** Espera a que todo lo pendiente esté escrito en Dexie. */
  flush(): Promise<void>
}

/** Fábrica con la base y el reloj inyectables, para poder probarla. */
export function createWorkoutStore(db: ForjaDB, clock: () => number = Date.now) {
  let timer: ReturnType<typeof setTimeout> | null = null
  let queue: Promise<unknown> = Promise.resolve()

  const write = (a: ActiveWorkout | null) => {
    queue = queue
      .then(async () => {
        if (a) await saveActive(db, a)
        else await clearActive(db)
      })
      .catch((e) => console.error('No se pudo guardar el entreno', e))
  }

  const store = create<WorkoutState>()((set, get) => {
    const update = (fn: (a: ActiveWorkout) => ActiveWorkout) =>
      set((s) => (s.active ? { active: fn(s.active) } : s))
    const updateItem = (i: number, fn: (it: ActiveItem) => ActiveItem) =>
      update((a) => ({ ...a, items: a.items.map((it, k) => (k === i ? fn(it) : it)) }))
    const updateSet = (i: number, j: number, fn: (s: ActiveSet) => ActiveSet) =>
      updateItem(i, (it) => ({ ...it, sets: it.sets.map((s, k) => (k === j ? fn(s) : s)) }))

    async function loadPrev(ids: string[], excludeId: string) {
      const missing = [...new Set(ids)].filter((id) => !(id in get().prev))
      if (!missing.length) return
      const found = await Promise.all(missing.map(async (id) => [id, (await previousSets(db, id, excludeId)) ?? []] as const))
      set((s) => ({ prev: { ...s.prev, ...Object.fromEntries(found) } }))
    }

    function begin(a: ActiveWorkout) {
      if (get().active) return // ya hay un entreno en curso
      set({ active: a, prev: {} })
      void loadPrev(a.items.map((i) => i.exerciseId), a.workoutId)
    }

    return {
      ready: false,
      active: null,
      prev: {},
      restDefault: DEFAULT_REST_SEC,
      showRpe: false,

      async hydrate() {
        const [active, restDefault, showRpe] = await Promise.all([
          loadActive(db),
          getRestDefault(db),
          getSetting(db, 'showRpe', false),
        ])
        set({ active: active ?? null, restDefault, showRpe: showRpe === true, prev: {}, ready: true })
        if (active) await loadPrev(active.items.map((i) => i.exerciseId), active.workoutId)
      },

      startEmpty: () => begin(emptyActive(clock())),
      startFromRoutine: (r) => begin(activeFromRoutine(r, clock(), get().restDefault)),
      startFromWorkout: (w) => begin(activeFromWorkout(w, clock(), get().restDefault)),
      rename: (name) => update((a) => ({ ...a, name })),

      addExercises(ids) {
        const a = get().active
        if (!a || !ids.length) return
        const rest = get().restDefault
        update((x) => ({
          ...x,
          items: [...x.items, ...ids.map((exerciseId): ActiveItem => ({ exerciseId, restSec: rest, sets: [blankSet()] }))],
        }))
        void loadPrev(ids, a.workoutId)
      },
      removeExercise: (i) => update((a) => ({ ...a, items: normalizeSupersets(a.items.filter((_, k) => k !== i)) })),
      moveExercise: (i, dir) => update((a) => ({ ...a, items: moveItem(a.items, i, dir) })),
      linkNext: (i) => update((a) => ({ ...a, items: linkWithNext(a.items, i) })),
      unlink: (i) => update((a) => ({ ...a, items: unlinkAt(a.items, i) })),
      setNote: (i, note) => updateItem(i, (it) => ({ ...it, note })),
      setRest: (i, sec) => updateItem(i, (it) => ({ ...it, restSec: Math.max(0, sec) })),

      addSet(i) {
        // la serie nueva copia el tipo "normal" y las metas de la última serie de trabajo
        updateItem(i, (it) => {
          const last = [...it.sets].reverse().find((s) => s.type !== 'warmup')
          return {
            ...it,
            sets: [
              ...it.sets,
              blankSet('normal', {
                ...(last?.targetReps ? { targetReps: last.targetReps } : {}),
                ...(last?.targetWeight != null ? { targetWeight: last.targetWeight } : {}),
              }),
            ],
          }
        })
      },
      insertWarmups: (i, sets) =>
        updateItem(i, (it) => ({
          ...it,
          sets: [...sets.map((s) => blankSet('warmup', { weight: s.kg, reps: s.reps })), ...it.sets],
        })),
      removeSet: (i, j) => updateItem(i, (it) => ({ ...it, sets: it.sets.filter((_, k) => k !== j) })),
      setSetType: (i, j, type) => updateSet(i, j, (s) => ({ ...s, type })),
      updateSet: (i, j, patch) => updateSet(i, j, (s) => ({ ...s, ...patch })),
      copyPrev(i, j) {
        const a = get().active
        const p = a && get().prev[a.items[i]?.exerciseId ?? '']?.[j]
        if (p) updateSet(i, j, (s) => ({ ...s, weight: p.weight, reps: p.reps }))
      },

      toggleDone(i, j) {
        const a = get().active
        const item = a?.items[i]
        const s = item?.sets[j]
        if (!a || !item || !s) return 'undone'
        if (s.done) {
          updateSet(i, j, (x) => ({ ...x, done: false }))
          return 'undone'
        }
        // campos vacíos: se completan con "Anterior" y, si no hay, con la meta de la rutina
        const p = get().prev[item.exerciseId]?.[j]
        const reps = s.reps ?? (p && p.reps > 0 ? p.reps : null) ?? repsFromTarget(s.targetReps)
        if (reps == null || reps <= 0) return 'missing-reps'
        const weight = s.weight ?? (p && p.weight > 0 ? p.weight : null) ?? s.targetWeight ?? null
        updateSet(i, j, (x) => ({ ...x, weight, reps, done: true }))
        const rest = item.restSec ?? get().restDefault
        if (rest > 0 && shouldStartRest(a.items, i, s.type)) get().startRest(rest)
        return 'done'
      },

      startRest: (sec) => update((a) => ({ ...a, restEndsAt: clock() + sec * 1000, restTotalSec: sec })),
      adjustRest(delta) {
        update((a) => {
          if (a.restEndsAt == null) return a
          const end = a.restEndsAt + delta * 1000
          if (end <= clock()) return { ...a, restEndsAt: null, restTotalSec: null }
          return { ...a, restEndsAt: end, restTotalSec: Math.max(1, (a.restTotalSec ?? 0) + delta) }
        })
      },
      endRest: () => update((a) => (a.restEndsAt == null ? a : { ...a, restEndsAt: null, restTotalSec: null })),

      setShowRpe(v) {
        set({ showRpe: v })
        void setSetting(db, 'showRpe', v)
      },

      async finish() {
        const a = get().active
        if (!a) return null
        await get().flush()
        const result = await finishWorkout(db, a, clock())
        if (result) set({ active: null })
        return result
      },
      async discard() {
        if (timer) {
          clearTimeout(timer)
          timer = null
        }
        set({ active: null })
        await queue
      },

      async flush() {
        if (timer) {
          clearTimeout(timer)
          timer = null
          write(get().active)
        }
        await queue
      },
    }
  })

  // Persistencia: escribe 250 ms después del último cambio; al quedar sin entreno, borra de inmediato.
  store.subscribe((state, prev) => {
    if (state.active === prev.active) return
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    if (!state.active) return write(null)
    timer = setTimeout(() => {
      timer = null
      write(store.getState().active)
    }, 250)
  })

  return store
}

export const useWorkout = createWorkoutStore(appDb)

/** Guarda al ocultar o cerrar la app: iOS puede matarla sin avisar. */
export function installFlushOnHide(store: ReturnType<typeof createWorkoutStore> = useWorkout): () => void {
  const flush = () => void store.getState().flush()
  const onVis = () => document.visibilityState === 'hidden' && flush()
  document.addEventListener('visibilitychange', onVis)
  window.addEventListener('pagehide', flush)
  return () => {
    document.removeEventListener('visibilitychange', onVis)
    window.removeEventListener('pagehide', flush)
  }
}
