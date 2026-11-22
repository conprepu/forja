import { describe, expect, it } from 'vitest'
import { deleteBody, saveBody } from '../../src/db/body'
import { todayStr } from '../../src/lib/dates'
import { freshDb } from './helpers'

describe('medidas corporales', () => {
  it('guarda una fila por día y conserva los campos no enviados', async () => {
    const db = await freshDb()
    await saveBody(db, '2026-11-01', { weight: 80, waist: 90 })
    await saveBody(db, '2026-11-01', { weight: 79.5 })
    expect(await db.body.get('2026-11-01')).toEqual({ id: '2026-11-01', date: '2026-11-01', weight: 79.5, waist: 90 })
    expect(await db.body.count()).toBe(1)
  })
  it('null borra un campo y sin campos borra el día', async () => {
    const db = await freshDb()
    await saveBody(db, '2026-11-01', { weight: 80, waist: 90 })
    await saveBody(db, '2026-11-01', { waist: null })
    expect(await db.body.get('2026-11-01')).not.toHaveProperty('waist')
    expect(await saveBody(db, '2026-11-01', { weight: null })).toBeNull()
    expect(await db.body.count()).toBe(0)
  })
  it('el peso de hoy actualiza el perfil; el de otro día no', async () => {
    const db = await freshDb()
    await db.settings.put({ key: 'profile', value: { sex: 'm', age: 30, height: 178, weight: 70, act: 1.55, goal: 'mant' } })
    await saveBody(db, '2020-01-01', { weight: 99 })
    expect(((await db.settings.get('profile'))?.value as { weight: number }).weight).toBe(70)
    await saveBody(db, todayStr(), { weight: 81.2 })
    expect(((await db.settings.get('profile'))?.value as { weight: number }).weight).toBe(81.2)
  })
  it('sin perfil guardado no inventa uno', async () => {
    const db = await freshDb()
    await saveBody(db, todayStr(), { weight: 81 })
    expect(await db.settings.get('profile')).toBeUndefined()
  })
  it('deleteBody', async () => {
    const db = await freshDb()
    await saveBody(db, '2026-11-01', { weight: 80 })
    await deleteBody(db, '2026-11-01')
    expect(await db.body.count()).toBe(0)
  })
})
