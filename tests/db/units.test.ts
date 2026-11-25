import { describe, expect, it } from 'vitest'
import { getLbExercises, setExerciseUnit } from '../../src/db/prefs'
import { freshDb } from './helpers'

describe('unidad por ejercicio', () => {
  it('por defecto todo en kg; marcar y desmarcar lb', async () => {
    const db = await freshDb()
    expect(await getLbExercises(db)).toEqual([])
    await setExerciseUnit(db, 'lp', 'lb')
    await setExerciseUnit(db, 'lat', 'lb')
    await setExerciseUnit(db, 'lp', 'lb') // repetido: no se duplica
    expect((await getLbExercises(db)).sort()).toEqual(['lat', 'lp'])
    await setExerciseUnit(db, 'lp', 'kg')
    expect(await getLbExercises(db)).toEqual(['lat'])
  })
})
