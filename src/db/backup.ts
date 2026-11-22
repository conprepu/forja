import { TABLE_NAMES, type ForjaDB, type TableName } from './db'
import { PROTO_MIGRATED_KEY } from './migratePrototype'
import { SEED_KEY, seedDb } from './seed'

export const BACKUP_FORMAT = 'forja-backup'
export const BACKUP_VERSION = 1

export interface Backup {
  format: typeof BACKUP_FORMAT
  version: number
  exportedAt: string
  tables: Record<TableName, unknown[]>
}

export class BackupError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'BackupError'
  }
}

/** Campo que identifica una fila en cada tabla. */
const PRIMARY_KEY: Record<TableName, string> = {
  exercises: 'id',
  folders: 'id',
  routines: 'id',
  workouts: 'id',
  activeWorkout: 'id',
  prs: 'id',
  body: 'id',
  foods: 'id',
  recipes: 'id',
  meals: 'id',
  diary: 'id',
  water: 'date',
  settings: 'key',
}

type Row = Record<string, unknown>

/** Exporta todo lo del usuario. Las filas de seed no van: se regeneran al importar. */
export async function exportBackup(db: ForjaDB): Promise<Backup> {
  const tables = {} as Record<TableName, unknown[]>
  for (const name of TABLE_NAMES) {
    let rows: unknown[] = await db.table(name).toArray()
    if (name === 'exercises') rows = (rows as { custom: boolean }[]).filter((r) => r.custom)
    if (name === 'foods') rows = (rows as { source: string }[]).filter((r) => r.source !== 'local')
    if (name === 'settings') {
      rows = (rows as { key: string }[]).filter((r) => r.key !== SEED_KEY && r.key !== PROTO_MIGRATED_KEY)
    }
    tables[name] = rows
  }
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: new Date().toISOString(), tables }
}

export function backupToJson(backup: Backup): string {
  return JSON.stringify(backup)
}

/** Valida el archivo completo antes de tocar la base: si algo está mal, no se escribe nada. */
export function parseBackup(text: string): Backup {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new BackupError('El archivo no es un JSON válido.')
  }
  const o = raw as Partial<Backup> | null
  if (!o || typeof o !== 'object' || o.format !== BACKUP_FORMAT) {
    throw new BackupError('Este archivo no es un respaldo de Forja.')
  }
  if (typeof o.version !== 'number' || !Number.isInteger(o.version) || o.version < 1) {
    throw new BackupError('El respaldo no trae una versión válida.')
  }
  if (o.version > BACKUP_VERSION) {
    throw new BackupError('El respaldo es de una versión más nueva de Forja. Actualiza la app e inténtalo de nuevo.')
  }
  if (!o.tables || typeof o.tables !== 'object') throw new BackupError('El respaldo no trae datos.')

  const tables = {} as Record<TableName, unknown[]>
  for (const name of TABLE_NAMES) {
    const rows = (o.tables as Record<string, unknown>)[name] ?? []
    if (!Array.isArray(rows)) throw new BackupError(`La tabla "${name}" del respaldo está dañada.`)
    const pk = PRIMARY_KEY[name]
    for (const r of rows) {
      const key = r && typeof r === 'object' ? (r as Row)[pk] : undefined
      if (typeof key !== 'string' || key === '') {
        throw new BackupError(`Hay una fila sin "${pk}" en la tabla "${name}".`)
      }
    }
    tables[name] = rows
  }
  return { format: BACKUP_FORMAT, version: o.version, exportedAt: String(o.exportedAt ?? ''), tables }
}

/** Reemplaza todos los datos por los del respaldo, en una sola transacción. */
export async function importBackup(db: ForjaDB, backup: Backup): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    for (const name of TABLE_NAMES) {
      const table = db.table(name)
      await table.clear()
      await table.bulkPut(backup.tables[name])
    }
  })
  await afterReplace(db)
}

/** Borra todos los datos del usuario y deja solo el seed. */
export async function wipeAll(db: ForjaDB): Promise<void> {
  await db.transaction('rw', db.tables, async () => {
    for (const name of TABLE_NAMES) await db.table(name).clear()
  })
  await afterReplace(db)
}

/** Tras reemplazar todo: re-siembra y evita que el próximo arranque vuelva a migrar el localStorage viejo. */
async function afterReplace(db: ForjaDB): Promise<void> {
  await seedDb(db)
  if (!(await db.settings.get(PROTO_MIGRATED_KEY))) {
    await db.settings.put({ key: PROTO_MIGRATED_KEY, value: Date.now() })
  }
}
