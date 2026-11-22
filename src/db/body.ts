import { todayStr } from '../lib/dates'
import type { ForjaDB } from './db'
import type { BodyEntry, Profile } from './schema'

export const BODY_FIELDS = ['weight', 'bodyFat', 'waist', 'chest', 'arm', 'thigh'] as const
export type BodyField = (typeof BODY_FIELDS)[number]

export const BODY_LABEL: Record<BodyField, { label: string; unit: string }> = {
  weight: { label: 'Peso', unit: 'kg' },
  bodyFat: { label: '% grasa', unit: '%' },
  waist: { label: 'Cintura', unit: 'cm' },
  chest: { label: 'Pecho', unit: 'cm' },
  arm: { label: 'Brazo', unit: 'cm' },
  thigh: { label: 'Muslo', unit: 'cm' },
}

/**
 * Guarda las medidas de un día (una fila por día, id = fecha). Los campos que no vienen se conservan;
 * los que vienen como null se borran. Si es el peso de hoy, actualiza el perfil para las metas.
 */
export async function saveBody(
  db: ForjaDB,
  date: string,
  values: Partial<Record<BodyField, number | null>>,
): Promise<BodyEntry | null> {
  return db.transaction('rw', db.body, db.settings, async () => {
    const entry: BodyEntry = { ...(await db.body.get(date)), id: date, date }
    for (const f of BODY_FIELDS) {
      const v = values[f]
      if (v === null) delete entry[f]
      else if (v !== undefined) entry[f] = v
    }
    if (BODY_FIELDS.every((f) => entry[f] === undefined)) {
      await db.body.delete(date)
      return null
    }
    await db.body.put(entry)
    if (date === todayStr() && entry.weight) {
      const row = await db.settings.get('profile')
      if (row) await db.settings.put({ key: 'profile', value: { ...(row.value as Profile), weight: entry.weight } })
    }
    return entry
  })
}

export const deleteBody = (db: ForjaDB, date: string) => db.body.delete(date)
