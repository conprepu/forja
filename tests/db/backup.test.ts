import { describe, expect, it } from 'vitest'
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  BackupError,
  backupToJson,
  exportBackup,
  importBackup,
  parseBackup,
  wipeAll,
} from '../../src/db/backup'
import type { ForjaDB } from '../../src/db/db'
import { seedExercises, seedFoods } from '../../src/db/seed'
import { freshDb } from './helpers'

async function fillUserData(db: ForjaDB) {
  await db.exercises.put({ id: 'x1', name: 'Mi ejercicio', muscle: 'Core', equipment: 'Otro', type: 'time', custom: true })
  await db.foods.put({ id: 'f1', name: 'Mi comida', per100: { kcal: 100, p: 5, c: 10, f: 2 }, servings: [{ label: '1 pz', grams: 80 }], source: 'custom' })
  await db.routines.put({ id: 'r1', name: 'Push', order: 0, items: [{ exerciseId: 'bench', restSec: 90, sets: [{ type: 'normal', targetReps: '5-8' }] }] })
  await db.workouts.put({
    id: 'w1', name: 'Push', startedAt: 1, endedAt: 2, note: 'bien',
    items: [{ exerciseId: 'bench', sets: [{ type: 'warmup', weight: 40, reps: 10, done: true }, { type: 'normal', weight: 80, reps: 5, rpe: 8, done: true }] }],
  })
  await db.activeWorkout.put({ id: 'current', workoutId: 'w9', name: 'En curso', startedAt: 5, restEndsAt: 99, items: [{ exerciseId: 'squat', sets: [{ type: 'normal', weight: null, reps: null, done: false }] }] })
  await db.prs.put({ id: 'p1', exerciseId: 'bench', kind: 'e1rm', value: 93, workoutId: 'w1', date: '2026-11-01' })
  await db.body.put({ id: '2026-11-01', date: '2026-11-01', weight: 80, bodyFat: 15 })
  await db.recipes.put({ id: 'rc1', name: 'Bowl', servings: 2, ingredients: [{ foodId: 'b0', grams: 200 }] })
  await db.meals.put({ id: 'm1', name: 'Desayuno', entries: [{ name: 'Huevo', foodId: 'b10', grams: 100, kcal: 143, p: 12.6, c: 0.7, f: 9.5 }] })
  await db.diary.put({ id: 'd1', date: '2026-11-20', slot: 'cena', name: 'Pollo', foodId: 'b0', grams: 120, kcal: 198, p: 37, c: 0, f: 4 })
  await db.water.put({ date: '2026-11-20', ml: 1500 })
  await db.settings.bulkPut([{ key: 'profile', value: { sex: 'm', age: 30 } }, { key: 'restSec', value: 120 }])
}

async function snapshot(db: ForjaDB) {
  const { exportedAt: _ignored, ...rest } = await exportBackup(db)
  return rest
}

describe('respaldo', () => {
  it('exportar, borrar e importar no pierde nada', async () => {
    const db = await freshDb()
    await fillUserData(db)
    const before = await snapshot(db)
    const json = backupToJson(await exportBackup(db))

    await wipeAll(db)
    expect(await db.workouts.count()).toBe(0)
    expect(await db.activeWorkout.count()).toBe(0)
    expect(await db.diary.count()).toBe(0)

    await importBackup(db, parseBackup(json))
    expect(await snapshot(db)).toEqual(before)
    // y el catálogo base sigue ahí
    expect(await db.exercises.count()).toBe(seedExercises.length + 1)
    expect(await db.foods.count()).toBe(seedFoods.length + 1)
  })

  it('restaura en otra base distinta', async () => {
    const a = await freshDb()
    await fillUserData(a)
    const b = await freshDb()
    await importBackup(b, parseBackup(backupToJson(await exportBackup(a))))
    expect(await snapshot(b)).toEqual(await snapshot(a))
  })

  it('importar reemplaza lo que hubiera en la base', async () => {
    const a = await freshDb()
    await fillUserData(a)
    const json = backupToJson(await exportBackup(a))
    const b = await freshDb()
    await b.water.put({ date: '2020-01-01', ml: 1 })
    await b.exercises.put({ id: 'viejo', name: 'Viejo', muscle: 'Core', equipment: 'Otro', type: 'reps', custom: true })
    await importBackup(b, parseBackup(json))
    expect(await b.water.get('2020-01-01')).toBeUndefined()
    expect(await b.exercises.get('viejo')).toBeUndefined()
  })

  it('no exporta filas del seed', async () => {
    const db = await freshDb()
    const backup = await exportBackup(db)
    expect(backup.tables.exercises).toEqual([])
    expect(backup.tables.foods).toEqual([])
    expect(JSON.stringify(backup.tables.settings)).not.toContain('seedVersion')
    expect(backup.format).toBe(BACKUP_FORMAT)
    expect(backup.version).toBe(BACKUP_VERSION)
  })

  it('borrar todo deja solo el seed', async () => {
    const db = await freshDb()
    await fillUserData(db)
    await wipeAll(db)
    expect(await db.exercises.count()).toBe(seedExercises.length)
    expect(await db.foods.count()).toBe(seedFoods.length)
    expect(await db.routines.count()).toBe(0)
  })

  describe('validación (no escribe nada si el archivo está mal)', () => {
    const ok = () => ({ format: BACKUP_FORMAT, version: 1, exportedAt: '', tables: {} })

    it('rechaza JSON roto', () => {
      expect(() => parseBackup('{no')).toThrow(BackupError)
    })
    it('rechaza archivos que no son de Forja', () => {
      expect(() => parseBackup(JSON.stringify({ hola: 1 }))).toThrow(/no es un respaldo de Forja/)
      expect(() => parseBackup('null')).toThrow(BackupError)
    })
    it('rechaza versiones más nuevas', () => {
      expect(() => parseBackup(JSON.stringify({ ...ok(), version: BACKUP_VERSION + 1 }))).toThrow(/más nueva/)
    })
    it('rechaza tablas que no son listas', () => {
      expect(() => parseBackup(JSON.stringify({ ...ok(), tables: { workouts: {} } }))).toThrow(/workouts/)
    })
    it('rechaza filas sin clave', () => {
      expect(() => parseBackup(JSON.stringify({ ...ok(), tables: { water: [{ ml: 5 }] } }))).toThrow(/water/)
      expect(() => parseBackup(JSON.stringify({ ...ok(), tables: { settings: [null] } }))).toThrow(/settings/)
    })
    it('acepta un respaldo con tablas faltantes', () => {
      const b = parseBackup(JSON.stringify(ok()))
      expect(b.tables.workouts).toEqual([])
    })

    it('un archivo inválido no altera la base', async () => {
      const db = await freshDb()
      await fillUserData(db)
      const before = await snapshot(db)
      expect(() => parseBackup(JSON.stringify({ ...ok(), tables: { diary: [{ nope: 1 }] } }))).toThrow()
      expect(await snapshot(db)).toEqual(before)
    })

    it('si la transacción falla a medias, revierte todo', async () => {
      const db = await freshDb()
      await fillUserData(db)
      const before = await snapshot(db)
      const bad = parseBackup(JSON.stringify(ok()))
      // fila con clave duplicada en un índice válido pero valor imposible de clonar
      bad.tables.water = [{ date: '2026-01-01', ml: 1, boom: () => 1 }]
      await expect(importBackup(db, bad)).rejects.toThrow()
      expect(await snapshot(db)).toEqual(before)
    })
  })
})
