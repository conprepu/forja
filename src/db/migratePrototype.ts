// Migración desde legacy/prototype.html. Es el ÚNICO lugar donde se toca localStorage.
//
// Estructura del prototipo (estado S):
//   S.core  = { profile, goals, rest, routines, customEx, customFoods, recents, meals, body, active }
//   S.w[YYYY-MM].items = entrenos terminados   S.f[YYYY-MM].days[YYYY-MM-DD] = { m: {b,l,d,s}, water }
// Los ids se conservan, así que aplicar la migración dos veces no duplica nada.
import type { ForjaDB } from './db'
import type {
  ActiveItem,
  ActiveWorkout,
  BodyEntry,
  DiaryEntry,
  DiarySlot,
  Exercise,
  ExerciseType,
  Food,
  FoodEntry,
  Meal,
  Routine,
  Setting,
  SetType,
  Water,
  Workout,
} from './schema'

export const PROTOTYPE_STORAGE_KEY = 'forja-v1'
/** Setting que marca que ya se revisó el localStorage del prototipo; evita re-migrar tras borrar o importar. */
export const PROTO_MIGRATED_KEY = 'prototypeChecked'
/** El prototipo contaba vasos de agua; la base guarda ml. */
export const ML_PER_GLASS = 250

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v)
const obj = (v: unknown): Obj => (isObj(v) ? v : {})
const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
const str = (v: unknown, d = ''): string => (typeof v === 'string' ? v : v == null ? d : String(v))
const num = (v: unknown, d = 0): number => {
  const n = typeof v === 'number' ? v : parseFloat(str(v).replace(',', '.'))
  return Number.isFinite(n) ? n : d
}
const numOrNull = (v: unknown): number | null =>
  v === '' || v == null ? null : Number.isFinite(num(v, NaN)) ? num(v) : null

const SET_TYPE: Record<string, SetType> = { n: 'normal', w: 'warmup', d: 'drop', x: 'failure' }
const setType = (t: unknown): SetType => SET_TYPE[str(t)] ?? 'normal'

const SLOTS: [string, DiarySlot][] = [
  ['b', 'desayuno'],
  ['l', 'comida'],
  ['d', 'cena'],
  ['s', 'snack'],
]

function exerciseType(kind: unknown): { type: ExerciseType; bodyweight?: true } {
  switch (str(kind)) {
    case 'bw':
      return { type: 'weight_reps', bodyweight: true }
    case 't':
      return { type: 'time' }
    case 'c':
      return { type: 'distance' }
    default:
      return { type: 'weight_reps' }
  }
}

export interface MigrationResult {
  exercises: Exercise[]
  foods: Food[]
  routines: Routine[]
  workouts: Workout[]
  body: BodyEntry[]
  diary: DiaryEntry[]
  meals: Meal[]
  water: Water[]
  settings: Setting[]
  activeWorkout: ActiveWorkout | null
}

export type MigrationSummary = Record<Exclude<keyof MigrationResult, 'activeWorkout'>, number> & {
  activeWorkout: number
}

function toEntry(e: Obj): FoodEntry {
  const grams = num(e.g)
  return {
    name: str(e.n, 'Alimento'),
    ...(e.fid ? { foodId: str(e.fid) } : {}),
    ...(grams > 0 ? { grams } : {}),
    kcal: num(e.k),
    p: num(e.p),
    c: num(e.c),
    f: num(e.f),
  }
}

/** Convierte el estado S del prototipo al esquema nuevo. Pura: no toca la base. */
export function convertPrototype(raw: unknown): MigrationResult {
  const S = obj(raw)
  if (!isObj(S.core)) throw new Error('No parece un respaldo del prototipo de Forja.')
  const core = S.core

  const exercises: Exercise[] = arr(core.customEx).filter(isObj).map((e) => ({
    id: str(e.id),
    name: str(e.n, 'Ejercicio'),
    muscle: str(e.m, 'Core'),
    equipment: str(e.eq) || 'Otro',
    ...exerciseType(e.k),
    custom: true,
  }))

  const foods: Food[] = arr(core.customFoods).filter(isObj).map((f) => {
    const grams = num(f.sg)
    return {
      id: str(f.id),
      name: str(f.n, 'Alimento'),
      per100: { kcal: num(f.k), p: num(f.p), c: num(f.c), f: num(f.f) },
      servings: grams > 0 ? [{ label: str(f.sl, `${grams} g`), grams }] : [],
      source: 'custom',
    }
  })

  const routines: Routine[] = arr(core.routines).filter(isObj).map((r, order) => ({
    id: str(r.id),
    name: str(r.name, `Rutina ${order + 1}`),
    order,
    items: arr(r.ex).filter(isObj).map((e) => {
      const reps = str(e.reps)
      return {
        exerciseId: str(e.eid),
        restSec: num(e.rest, 90),
        sets: Array.from({ length: Math.max(1, Math.round(num(e.sets, 1))) }, () => ({
          type: 'normal' as const,
          ...(reps ? { targetReps: reps } : {}),
        })),
      }
    }),
    ...(num(r.last) > 0 ? { lastUsedAt: num(r.last) } : {}),
  }))

  const workouts: Workout[] = []
  for (const shard of Object.values(obj(S.w))) {
    for (const w of arr(obj(shard).items).filter(isObj)) {
      const startedAt = num(w.start)
      workouts.push({
        id: str(w.id) || `w-${startedAt}`,
        ...(w.rid ? { routineId: str(w.rid) } : {}),
        name: str(w.name, 'Entrenamiento'),
        startedAt,
        endedAt: num(w.end, startedAt),
        note: '',
        items: arr(w.ex).filter(isObj).map((e) => ({
          exerciseId: str(e.eid),
          ...(e.rest != null ? { restSec: num(e.rest) } : {}),
          ...(e.note ? { note: str(e.note) } : {}),
          sets: arr(e.sets).filter(isObj).map((s) => ({
            type: setType(s.t),
            weight: num(s.kg),
            reps: num(s.r),
            done: true,
          })),
        })),
      })
    }
  }

  const body: BodyEntry[] = arr(core.body).filter(isObj).filter((b) => str(b.d)).map((b) => ({
    id: str(b.d),
    date: str(b.d),
    weight: num(b.w),
  }))

  const diary: DiaryEntry[] = []
  const water: Water[] = []
  for (const shard of Object.values(obj(S.f))) {
    for (const [date, d] of Object.entries(obj(obj(shard).days))) {
      const day = obj(d)
      for (const [key, slot] of SLOTS) {
        arr(obj(day.m)[key]).filter(isObj).forEach((e, i) => {
          diary.push({ id: str(e.id) || `${date}-${slot}-${i}`, date, slot, ...toEntry(e) })
        })
      }
      const glasses = num(day.water)
      if (glasses > 0) water.push({ date, ml: Math.round(glasses * ML_PER_GLASS) })
    }
  }

  const meals: Meal[] = arr(core.meals).filter(isObj).map((m) => ({
    id: str(m.id),
    name: str(m.n, 'Mi comida'),
    entries: arr(m.items).filter(isObj).map(toEntry),
  }))

  const settings: Setting[] = []
  if (isObj(core.profile)) settings.push({ key: 'profile', value: { ...core.profile } })
  if (isObj(core.goals)) {
    const { water: glasses, ...macros } = core.goals
    settings.push({ key: 'goals', value: { ...macros, waterMl: Math.round(num(glasses, 8) * ML_PER_GLASS) } })
  }
  if (core.rest != null) settings.push({ key: 'restSec', value: num(core.rest, 90) })
  if (Array.isArray(core.recents)) settings.push({ key: 'recentFoods', value: core.recents.map(String) })

  let activeWorkout: ActiveWorkout | null = null
  if (isObj(core.active)) {
    const a = core.active
    const startedAt = num(a.start, Date.now())
    activeWorkout = {
      id: 'current',
      workoutId: str(a.id) || `w-${startedAt}`,
      ...(a.rid ? { routineId: str(a.rid) } : {}),
      name: str(a.name, 'Entrenamiento'),
      startedAt,
      restEndsAt: null,
      items: arr(a.ex).filter(isObj).map((e): ActiveItem => ({
        exerciseId: str(e.eid),
        ...(e.rest != null ? { restSec: num(e.rest) } : {}),
        ...(e.note ? { note: str(e.note) } : {}),
        sets: arr(e.sets).filter(isObj).map((s) => ({
          type: setType(s.t),
          weight: numOrNull(s.kg),
          reps: numOrNull(s.r),
          done: !!s.done,
        })),
      })),
    }
  }

  return { exercises, foods, routines, workouts, body, diary, meals, water, settings, activeWorkout }
}

/**
 * Escribe la migración sin borrar nada (upsert por id, idempotente).
 * No pisa un entreno en curso que ya exista en la base nueva.
 */
export async function applyMigration(db: ForjaDB, res: MigrationResult): Promise<MigrationSummary> {
  let activeWorkout = 0
  await db.transaction('rw', db.tables, async () => {
    await db.exercises.bulkPut(res.exercises)
    await db.foods.bulkPut(res.foods)
    await db.routines.bulkPut(res.routines)
    await db.workouts.bulkPut(res.workouts)
    await db.body.bulkPut(res.body)
    await db.diary.bulkPut(res.diary)
    await db.meals.bulkPut(res.meals)
    await db.water.bulkPut(res.water)
    await db.settings.bulkPut(res.settings)
    if (res.activeWorkout && !(await db.activeWorkout.get('current'))) {
      await db.activeWorkout.put(res.activeWorkout)
      activeWorkout = 1
    }
  })
  return {
    exercises: res.exercises.length,
    foods: res.foods.length,
    routines: res.routines.length,
    workouts: res.workouts.length,
    body: res.body.length,
    diary: res.diary.length,
    meals: res.meals.length,
    water: res.water.length,
    settings: res.settings.length,
    activeWorkout,
  }
}

/** Lee el estado guardado por el prototipo en este mismo origen; null si no hay. */
export function readPrototypeLocalStorage(
  storage: Pick<Storage, 'getItem'> | undefined = globalThis.localStorage,
): unknown | null {
  try {
    const text = storage?.getItem(PROTOTYPE_STORAGE_KEY)
    if (!text) return null
    const parsed: unknown = JSON.parse(text)
    return isObj(parsed) && isObj(parsed.core) ? parsed : null
  } catch {
    return null
  }
}

/** Acepta el JSON de respaldo del prototipo: el estado S directo o envuelto en { data }. */
export function parsePrototypeBackup(text: string): unknown {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('El archivo no es un JSON válido.')
  }
  const s = isObj(raw) && isObj(raw.data) ? raw.data : raw
  if (!isObj(s) || !isObj(s.core)) throw new Error('No parece un respaldo del prototipo de Forja.')
  return s
}
