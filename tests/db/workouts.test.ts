import { describe, expect, it } from 'vitest'
import { backupToJson, exportBackup, importBackup, parseBackup, BACKUP_FORMAT } from '../../src/db/backup'
import type { ForjaDB } from '../../src/db/db'
import type { ActiveWorkout, Workout } from '../../src/db/schema'
import {
  addSampleRoutines,
  createFolder,
  createRoutine,
  deleteFolder,
  deleteRoutine,
  deleteWorkout,
  duplicateRoutine,
  finishWorkout,
  getRestDefault,
  loadActive,
  moveRoutine,
  previousSets,
  recentWorkouts,
  saveActive,
  setRoutineFolder,
} from '../../src/db/workouts'
import { blankSet, emptyActive } from '../../src/lib/workout'
import { freshDb } from './helpers'

const names = async (db: ForjaDB) => (await db.routines.orderBy('order').toArray()).map((r) => r.name)
const item = (exerciseId: string) => ({ exerciseId, restSec: 90, sets: [{ type: 'normal' as const }] })
const doneSet = (weight: number, reps: number, type: 'normal' | 'warmup' = 'normal') => ({ ...blankSet(type), weight, reps, done: true })

function active(id: string, startedAt: number, items: ActiveWorkout['items'], routineId?: string): ActiveWorkout {
  return { ...emptyActive(startedAt), workoutId: id, items, ...(routineId ? { routineId } : {}) }
}

describe('rutinas', () => {
  it('crea con orden creciente y nombre por defecto', async () => {
    const db = await freshDb()
    await createRoutine(db, { name: 'A', items: [] })
    await createRoutine(db, { name: '  ', items: [] })
    const all = await db.routines.orderBy('order').toArray()
    expect(all.map((r) => [r.name, r.order])).toEqual([['A', 0], ['Rutina', 1]])
  })

  it('duplica justo debajo, sin copiar la fecha de uso', async () => {
    const db = await freshDb()
    const a = await createRoutine(db, { name: 'A', items: [item('bench')] })
    await createRoutine(db, { name: 'B', items: [] })
    await db.routines.update(a.id, { lastUsedAt: 99 })
    const copy = await duplicateRoutine(db, a.id)
    expect(await names(db)).toEqual(['A', 'A (copia)', 'B'])
    expect(copy?.id).not.toBe(a.id)
    expect((await db.routines.get(copy!.id))?.lastUsedAt).toBeUndefined()
    expect((await db.routines.get(copy!.id))?.items).toEqual(a.items)
    expect(await duplicateRoutine(db, 'nope')).toBeUndefined()
  })

  it('sube y baja entre las de su carpeta', async () => {
    const db = await freshDb()
    const f = await createFolder(db, 'Fuerza')
    const a = await createRoutine(db, { name: 'A', items: [], folderId: f.id })
    await createRoutine(db, { name: 'X', items: [] })
    const b = await createRoutine(db, { name: 'B', items: [], folderId: f.id })
    await moveRoutine(db, b.id, -1)
    expect(await names(db)).toEqual(['B', 'X', 'A'])
    await moveRoutine(db, b.id, -1) // ya es la primera de su carpeta
    expect(await names(db)).toEqual(['B', 'X', 'A'])
    await moveRoutine(db, a.id, 1) // ya es la última
    expect(await names(db)).toEqual(['B', 'X', 'A'])
  })

  it('mueve a una carpeta y la quita; borrar carpeta conserva las rutinas', async () => {
    const db = await freshDb()
    const f = await createFolder(db, ' Piernas ')
    expect(f.name).toBe('Piernas')
    const r = await createRoutine(db, { name: 'A', items: [] })
    await setRoutineFolder(db, r.id, f.id)
    expect((await db.routines.get(r.id))?.folderId).toBe(f.id)
    await deleteFolder(db, f.id)
    expect(await db.folders.count()).toBe(0)
    const after = await db.routines.get(r.id)
    expect(after?.name).toBe('A')
    expect(after).not.toHaveProperty('folderId')
    await setRoutineFolder(db, r.id, undefined)
    await deleteRoutine(db, r.id)
    expect(await db.routines.count()).toBe(0)
  })

  it('el ejemplo Push/Pull/Pierna usa ejercicios que existen en el catálogo', async () => {
    const db = await freshDb()
    await addSampleRoutines(db)
    expect(await names(db)).toEqual(['Push', 'Pull', 'Pierna'])
    for (const r of await db.routines.toArray()) {
      for (const it of r.items) expect(await db.exercises.get(it.exerciseId), it.exerciseId).toBeDefined()
    }
  })
})

describe('entreno en curso', () => {
  it('se guarda y se recupera tal cual', async () => {
    const db = await freshDb()
    expect(await loadActive(db)).toBeUndefined()
    const a = active('w1', 1000, [{ exerciseId: 'bench', sets: [blankSet(), doneSet(80, 5)] }])
    a.restEndsAt = 5000
    await saveActive(db, a)
    expect(await loadActive(db)).toEqual(a)
  })
  it('el descanso por defecto sale de los ajustes', async () => {
    const db = await freshDb()
    expect(await getRestDefault(db)).toBe(90)
    await db.settings.put({ key: 'restSec', value: 120 })
    expect(await getRestDefault(db)).toBe(120)
    await db.settings.put({ key: 'restSec', value: 'x' })
    expect(await getRestDefault(db)).toBe(90)
  })
})

describe('terminar entreno', () => {
  it('guarda el entreno, borra el activo y actualiza la rutina', async () => {
    const db = await freshDb()
    const r = await createRoutine(db, { name: 'Push', items: [item('bench')] })
    const a = active('w1', 1_000_000, [{ exerciseId: 'bench', sets: [doneSet(80, 5), blankSet()] }], r.id)
    await saveActive(db, a)
    const res = await finishWorkout(db, a, 1_000_000 + 3_600_000)
    expect(res).toMatchObject({ durationSec: 3600, volume: 400, sets: 1, prs: [] })
    expect(await db.workouts.get('w1')).toMatchObject({ routineId: r.id, name: 'Entrenamiento' })
    expect(await loadActive(db)).toBeUndefined()
    expect((await db.routines.get(r.id))?.lastUsedAt).toBe(1_000_000 + 3_600_000)
  })

  it('sin series hechas devuelve null y no toca nada', async () => {
    const db = await freshDb()
    const a = active('w1', 1000, [{ exerciseId: 'bench', sets: [blankSet()] }])
    await saveActive(db, a)
    expect(await finishWorkout(db, a)).toBeNull()
    expect(await db.workouts.count()).toBe(0)
    expect(await loadActive(db)).toBeDefined()
  })

  it('la primera vez no hay récords; la segunda con más peso sí', async () => {
    const db = await freshDb()
    const first = await finishWorkout(db, active('w1', 1000, [{ exerciseId: 'bench', sets: [doneSet(80, 5)] }]))
    expect(first?.prs).toEqual([])
    expect(await db.prs.count()).toBe(0)

    const second = await finishWorkout(db, active('w2', 2000, [{ exerciseId: 'bench', sets: [doneSet(85, 5)] }]))
    expect(second?.prs.map((p) => [p.kind, p.exerciseName]).sort()).toEqual([
      ['e1rm', 'Press de banca'],
      ['volume', 'Press de banca'],
      ['weight', 'Press de banca'],
    ])
    expect((await db.prs.toArray()).every((p) => p.workoutId === 'w2')).toBe(true)

    // volver a 80 ya no es récord
    const third = await finishWorkout(db, active('w3', 3000, [{ exerciseId: 'bench', sets: [doneSet(80, 5)] }]))
    expect(third?.prs).toEqual([])
  })

  it('los calentamientos pesados no generan récords', async () => {
    const db = await freshDb()
    await finishWorkout(db, active('w1', 1000, [{ exerciseId: 'bench', sets: [doneSet(80, 5)] }]))
    const res = await finishWorkout(db, active('w2', 2000, [{ exerciseId: 'bench', sets: [doneSet(150, 1, 'warmup'), doneSet(80, 5)] }]))
    expect(res?.prs).toEqual([])
  })

  it('compara contra todo el historial, no solo contra la última vez', async () => {
    const db = await freshDb()
    await finishWorkout(db, active('w1', 1000, [{ exerciseId: 'bench', sets: [doneSet(100, 5)] }]))
    await finishWorkout(db, active('w2', 2000, [{ exerciseId: 'bench', sets: [doneSet(80, 5)] }]))
    const res = await finishWorkout(db, active('w3', 3000, [{ exerciseId: 'bench', sets: [doneSet(90, 5)] }]))
    expect(res?.prs).toEqual([])
  })

  it('el mismo ejercicio dos veces en un entreno se evalúa junto', async () => {
    const db = await freshDb()
    await finishWorkout(db, active('w1', 1000, [{ exerciseId: 'bench', sets: [doneSet(80, 5)] }]))
    const res = await finishWorkout(
      db,
      active('w2', 2000, [
        { exerciseId: 'bench', sets: [doneSet(60, 5)] },
        { exerciseId: 'ohp', sets: [doneSet(40, 5)] },
        { exerciseId: 'bench', sets: [doneSet(85, 5)] },
      ]),
    )
    expect(res?.prs.filter((p) => p.kind === 'weight')).toHaveLength(1)
    expect(await db.prs.count()).toBe(3)
  })

  it('peso corporal: récord de repeticiones; cardio: el volumen no cuenta kg×min', async () => {
    const db = await freshDb()
    await finishWorkout(db, active('w1', 1000, [{ exerciseId: 'push', sets: [doneSet(0, 20)] }]))
    const res = await finishWorkout(
      db,
      active('w2', 2000, [
        { exerciseId: 'push', sets: [doneSet(0, 25)] },
        { exerciseId: 'tread', sets: [doneSet(5, 30)] },
        { exerciseId: 'bench', sets: [doneSet(100, 5)] },
      ]),
    )
    expect(res?.prs).toEqual([{ exerciseId: 'push', exerciseName: 'Lagartijas', kind: 'reps', value: 25 }])
    expect(res?.volume).toBe(500)
  })

  it('un ejercicio desconocido no truena', async () => {
    const db = await freshDb()
    await finishWorkout(db, active('w1', 1000, [{ exerciseId: 'ya-no-existe', sets: [doneSet(10, 10)] }]))
    const res = await finishWorkout(db, active('w2', 2000, [{ exerciseId: 'ya-no-existe', sets: [doneSet(20, 10)] }]))
    expect(res?.prs.length).toBeGreaterThan(0)
  })
})

describe('historial', () => {
  async function seedHistory(db: ForjaDB) {
    const mk = (id: string, startedAt: number, exerciseId: string, w: number): Workout => ({
      id, name: id, startedAt, endedAt: startedAt + 1, note: '',
      items: [{ exerciseId, sets: [{ type: 'normal', weight: w, reps: 5, done: true }] }],
    })
    await db.workouts.bulkPut([mk('a', 1, 'bench', 70), mk('b', 2, 'squat', 100), mk('c', 3, 'bench', 80)])
  }

  it('previousSets devuelve la última vez que se hizo el ejercicio', async () => {
    const db = await freshDb()
    await seedHistory(db)
    expect((await previousSets(db, 'bench'))?.[0]?.weight).toBe(80)
    expect((await previousSets(db, 'bench', 'c'))?.[0]?.weight).toBe(70) // excluye el entreno actual
    expect(await previousSets(db, 'ohp')).toBeNull()
  })

  it('recientes: del más nuevo al más viejo', async () => {
    const db = await freshDb()
    await seedHistory(db)
    expect((await recentWorkouts(db, 2)).map((w) => w.id)).toEqual(['c', 'b'])
  })

  it('borrar un entreno borra también sus récords', async () => {
    const db = await freshDb()
    await finishWorkout(db, active('w1', 1000, [{ exerciseId: 'bench', sets: [doneSet(80, 5)] }]))
    await finishWorkout(db, active('w2', 2000, [{ exerciseId: 'bench', sets: [doneSet(90, 5)] }]))
    expect(await db.prs.count()).toBe(3)
    await deleteWorkout(db, 'w2')
    expect(await db.workouts.count()).toBe(1)
    expect(await db.prs.count()).toBe(0)
  })
})

describe('carpetas en el respaldo', () => {
  it('se exportan, se restauran y un respaldo viejo sin carpetas se sigue importando', async () => {
    const db = await freshDb()
    const f = await createFolder(db, 'Fuerza')
    await createRoutine(db, { name: 'A', items: [], folderId: f.id })
    const json = backupToJson(await exportBackup(db))
    const other = await freshDb()
    await importBackup(other, parseBackup(json))
    expect((await other.folders.toArray()).map((x) => x.name)).toEqual(['Fuerza'])
    expect((await other.routines.toArray())[0]?.folderId).toBe(f.id)

    const old = JSON.stringify({ format: BACKUP_FORMAT, version: 1, exportedAt: '', tables: { routines: [{ id: 'r', name: 'R', order: 0, items: [] }] } })
    await importBackup(other, parseBackup(old))
    expect(await other.folders.count()).toBe(0)
    expect(await other.routines.count()).toBe(1)
  })
})
