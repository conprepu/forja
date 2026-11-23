// Tipos de las tablas de Dexie. Fechas como 'YYYY-MM-DD' (hora local); instantes como ms epoch.

export type ExerciseType = 'weight_reps' | 'reps' | 'time' | 'distance'
export type SetType = 'normal' | 'warmup' | 'drop' | 'failure'
export type DiarySlot = 'desayuno' | 'comida' | 'cena' | 'snack'
export type FoodSource = 'off' | 'custom' | 'local'
export type PrKind = 'weight' | 'e1rm' | 'volume' | 'reps'

export interface Exercise {
  id: string
  name: string
  muscle: string
  secondary?: string[]
  equipment: string
  type: ExerciseType
  /** Peso corporal: el peso de la serie es lastre adicional (+kg). */
  bodyweight?: boolean
  /** false = viene del seed y se regenera; true = creado por el usuario. */
  custom: boolean
}

export interface RoutineSet {
  type: SetType
  /** Texto porque admite rangos: "8-12". */
  targetReps?: string
  targetWeight?: number
}

export interface RoutineItem {
  exerciseId: string
  sets: RoutineSet[]
  restSec: number
  supersetId?: string
  note?: string
}

export interface Routine {
  id: string
  name: string
  folderId?: string
  order: number
  items: RoutineItem[]
  lastUsedAt?: number
}

export interface WorkoutSet {
  type: SetType
  weight: number
  reps: number
  rpe?: number
  done: boolean
}

export interface WorkoutItem {
  exerciseId: string
  supersetId?: string
  restSec?: number
  note?: string
  sets: WorkoutSet[]
}

export interface Workout {
  id: string
  routineId?: string
  name: string
  startedAt: number
  endedAt: number
  note: string
  items: WorkoutItem[]
}

export interface ActiveSet {
  type: SetType
  /** null mientras el campo está vacío. */
  weight: number | null
  reps: number | null
  rpe?: number
  done: boolean
  /** Meta de la rutina ("8-12"), se muestra como placeholder. */
  targetReps?: string
  targetWeight?: number
}

export interface ActiveItem {
  exerciseId: string
  supersetId?: string
  restSec?: number
  note?: string
  sets: ActiveSet[]
}

/** Entreno en curso. Una sola fila (id 'current'); sobrevive a cerrar la app. */
export interface ActiveWorkout {
  id: 'current'
  workoutId: string
  routineId?: string
  name: string
  startedAt: number
  items: ActiveItem[]
  /** Fin del descanso en curso (timestamp), nunca un contador de ticks. */
  restEndsAt: number | null
  /** Duración total del descanso en curso, para la barra de progreso. */
  restTotalSec?: number | null
}

export interface Folder {
  id: string
  name: string
  order: number
}

export interface Pr {
  id: string
  exerciseId: string
  kind: PrKind
  value: number
  workoutId: string
  date: string
}

/** Una fila por día: id = date. */
export interface BodyEntry {
  id: string
  date: string
  weight?: number
  bodyFat?: number
  waist?: number
  chest?: number
  arm?: number
  thigh?: number
}

export interface Macros {
  kcal: number
  p: number
  c: number
  f: number
}

export interface Food {
  id: string
  name: string
  brand?: string
  barcode?: string
  per100: Macros & { fiber?: number }
  servings: { label: string; grams: number }[]
  source: FoodSource
  /** Otras formas de nombrarlo ("tocino", "bacon"): ayudan a reconocerlo al describir la comida. */
  aka?: string[]
  /** Palabras sueltas para las que este es el alimento de siempre ("leche" → leche entera). */
  dflt?: string[]
}

/** Macros ya calculados al momento de registrar: editar un alimento no altera el historial. */
export interface FoodEntry extends Macros {
  name: string
  /** Sin foodId ni recipeId = agregado rápido. */
  foodId?: string
  recipeId?: string
  grams?: number
}

export interface DiaryEntry extends FoodEntry {
  id: string
  date: string
  slot: DiarySlot
}

export interface Recipe {
  id: string
  name: string
  servings: number
  ingredients: { foodId: string; grams: number }[]
}

/** Comida guardada ("mi desayuno de siempre"). */
export interface Meal {
  id: string
  name: string
  entries: FoodEntry[]
}

export interface Water {
  date: string
  ml: number
}

export interface Setting {
  key: string
  value: unknown
}

export interface Profile {
  sex: 'm' | 'f'
  age: number
  height: number
  weight: number
  act: number
  goal: 'perder' | 'mant' | 'ganar'
}

export interface Goals extends Macros {
  waterMl: number
}
