import Dexie, { type EntityTable } from 'dexie'
import type {
  ActiveWorkout,
  BodyEntry,
  DiaryEntry,
  Exercise,
  Food,
  Meal,
  Pr,
  Recipe,
  Routine,
  Setting,
  Water,
  Workout,
} from './schema'

/** Tablas respaldables, en el orden en que se escriben en el JSON. */
export const TABLE_NAMES = [
  'exercises',
  'routines',
  'workouts',
  'activeWorkout',
  'prs',
  'body',
  'foods',
  'recipes',
  'meals',
  'diary',
  'water',
  'settings',
] as const
export type TableName = (typeof TABLE_NAMES)[number]

export class ForjaDB extends Dexie {
  exercises!: EntityTable<Exercise, 'id'>
  routines!: EntityTable<Routine, 'id'>
  workouts!: EntityTable<Workout, 'id'>
  activeWorkout!: EntityTable<ActiveWorkout, 'id'>
  prs!: EntityTable<Pr, 'id'>
  body!: EntityTable<BodyEntry, 'id'>
  foods!: EntityTable<Food, 'id'>
  recipes!: EntityTable<Recipe, 'id'>
  meals!: EntityTable<Meal, 'id'>
  diary!: EntityTable<DiaryEntry, 'id'>
  water!: EntityTable<Water, 'date'>
  settings!: EntityTable<Setting, 'key'>

  constructor(name = 'forja') {
    super(name)
    // Cambios de esquema = nueva this.version(n) con su migración. Nunca editar una versión publicada.
    this.version(1).stores({
      exercises: 'id, name, muscle, equipment',
      routines: 'id, folderId, order',
      workouts: 'id, startedAt, routineId',
      activeWorkout: 'id',
      prs: 'id, exerciseId, [exerciseId+kind]',
      body: 'id, date',
      foods: 'id, name, barcode, source',
      recipes: 'id, name',
      meals: 'id, name',
      diary: 'id, date, [date+slot]',
      water: 'date',
      settings: 'key',
    })
  }
}

export const db = new ForjaDB()
