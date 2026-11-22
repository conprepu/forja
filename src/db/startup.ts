import type { ForjaDB } from './db'
import {
  applyMigration,
  convertPrototype,
  PROTO_MIGRATED_KEY,
  readPrototypeLocalStorage,
} from './migratePrototype'
import { seedDb } from './seed'
import { requestPersistence } from './storage'

export interface StartupResult {
  persisted: boolean
  migrated: boolean
}

/** Abre la base, siembra el catálogo, pide almacenamiento persistente y migra el prototipo una vez. */
export async function startup(db: ForjaDB): Promise<StartupResult> {
  await db.open()
  await seedDb(db)
  const persisted = await requestPersistence()

  let migrated = false
  if (!(await db.settings.get(PROTO_MIGRATED_KEY))) {
    const raw = readPrototypeLocalStorage()
    if (raw) {
      await applyMigration(db, convertPrototype(raw))
      migrated = true
    }
    await db.settings.put({ key: PROTO_MIGRATED_KEY, value: Date.now() })
  }
  return { persisted, migrated }
}
