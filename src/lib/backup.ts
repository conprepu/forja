import { db as defaultDb, inboxList, SCHEMA_VERSION, type AppDB } from '../db/db'
import { COLORS, INBOX_ID, type Habit, type HabitLog, type List, type Task } from '../db/types'

/**
 * Formato de respaldo. REGLA: debe poder importarse cualquier respaldo de una
 * versión anterior. Si cambia el esquema, subir SCHEMA_VERSION y migrar en
 * `migrate()`; nunca romper la lectura de versiones viejas.
 */
export const APP_ID = 'ticktick-private'

export type BackupData = { lists: List[]; tasks: Task[]; habits: Habit[]; habitLogs: HabitLog[] }
export type Backup = { app: typeof APP_ID; schemaVersion: number; exportedAt: string; data: BackupData }

const PRE_IMPORT_KEY = 'preImportBackup'
const LAST_BACKUP_KEY = 'lastBackupAt'

export async function createBackup(db: AppDB = defaultDb): Promise<Backup> {
  return db.transaction('r', db.lists, db.tasks, db.habits, db.habitLogs, async () => ({
    app: APP_ID,
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      lists: await db.lists.toArray(),
      tasks: await db.tasks.toArray(),
      habits: await db.habits.toArray(),
      habitLogs: await db.habitLogs.toArray(),
    },
  }))
}

export function backupFileName(b: Backup): string {
  return `ticktick-private-${b.exportedAt.slice(0, 10)}.json`
}

// ── Validación ───────────────────────────────────────────────────────────

export class BackupError extends Error {}

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v)
const isStr = (v: unknown): v is string => typeof v === 'string'
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const isDate = (v: unknown): v is string => isStr(v) && /^\d{4}-\d{2}-\d{2}$/.test(v)
const strOrNull = (v: unknown) => v === null || isStr(v)
const isDays = (v: unknown) => Array.isArray(v) && v.length > 0 && v.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)
const isColor = (v: unknown) => (COLORS as readonly unknown[]).includes(v)

function isRecurrence(v: unknown): boolean {
  if (v === null) return true
  if (!isObj(v)) return false
  if (v.kind === 'daily') return true
  if (v.kind === 'weekly') return isDays(v.days)
  if (v.kind === 'monthly') return Number.isInteger(v.day) && (v.day as number) >= 1 && (v.day as number) <= 31
  return false
}

function isSchedule(v: unknown): boolean {
  if (!isObj(v)) return false
  if (v.kind === 'daily') return true
  if (v.kind === 'weekdays') return isDays(v.days)
  if (v.kind === 'weekly') return Number.isInteger(v.times) && (v.times as number) >= 1 && (v.times as number) <= 7
  return false
}

const validators = {
  lists: (r: Obj) => isStr(r.id) && isStr(r.name) && isColor(r.color) && isNum(r.order) && isStr(r.createdAt),
  tasks: (r: Obj) =>
    isStr(r.id) && isStr(r.listId) && isStr(r.title) && isStr(r.notes) &&
    (r.dueDate === null || isDate(r.dueDate)) && strOrNull(r.dueTime) &&
    [0, 1, 2, 3].includes(r.priority as number) && isRecurrence(r.recurrence) &&
    strOrNull(r.completedAt) && strOrNull(r.spawnedTaskId ?? null) &&
    isNum(r.order) && isStr(r.createdAt) && isStr(r.updatedAt),
  habits: (r: Obj) =>
    isStr(r.id) && isStr(r.name) && isColor(r.color) && isSchedule(r.schedule) &&
    isNum(r.order) && strOrNull(r.archivedAt) && isStr(r.createdAt),
  habitLogs: (r: Obj) => isStr(r.id) && isStr(r.habitId) && isDate(r.date),
} satisfies Record<keyof BackupData, (r: Obj) => boolean>

const TABLE_LABEL: Record<keyof BackupData, string> = { lists: 'listas', tasks: 'tareas', habits: 'hábitos', habitLogs: 'registros de hábitos' }

/** Valida y normaliza un JSON de respaldo. Lanza BackupError con un mensaje legible. */
export function parseBackup(input: unknown): Backup {
  if (!isObj(input) || input.app !== APP_ID) throw new BackupError('El archivo no es un respaldo de TickTick Private.')
  if (!Number.isInteger(input.schemaVersion) || (input.schemaVersion as number) < 1) throw new BackupError('Versión de respaldo inválida.')
  if ((input.schemaVersion as number) > SCHEMA_VERSION) {
    throw new BackupError('Este respaldo es de una versión más nueva de la app. Actualiza la app e inténtalo otra vez.')
  }
  if (!isObj(input.data)) throw new BackupError('El respaldo no contiene datos.')

  const data = {} as BackupData
  for (const key of Object.keys(validators) as (keyof BackupData)[]) {
    const rows = input.data[key]
    if (!Array.isArray(rows)) throw new BackupError(`Faltan las ${TABLE_LABEL[key]}.`)
    const bad = rows.findIndex((r) => !isObj(r) || !validators[key](r))
    if (bad !== -1) throw new BackupError(`Hay ${TABLE_LABEL[key]} con formato inválido (fila ${bad + 1}).`)
    ;(data as Record<string, unknown[]>)[key] = rows
  }

  const backup = migrate({ app: APP_ID, schemaVersion: input.schemaVersion as number, exportedAt: isStr(input.exportedAt) ? input.exportedAt : '', data })

  // Integridad: tareas apuntan a listas existentes; registros a hábitos existentes.
  const listIds = new Set(backup.data.lists.map((l) => l.id))
  if (!listIds.has(INBOX_ID)) backup.data.lists.unshift(inboxList())
  listIds.add(INBOX_ID)
  backup.data.tasks = backup.data.tasks.map((t) => (listIds.has(t.listId) ? t : { ...t, listId: INBOX_ID }))
  const habitIds = new Set(backup.data.habits.map((h) => h.id))
  const seen = new Set<string>()
  backup.data.habitLogs = backup.data.habitLogs.filter((l) => {
    const k = `${l.habitId}|${l.date}`
    if (!habitIds.has(l.habitId) || seen.has(k)) return false
    seen.add(k)
    return true
  })
  return backup
}

/** Migra respaldos de versiones anteriores al esquema actual. */
function migrate(b: Backup): Backup {
  // v1 es la primera versión. Solo se normalizan campos opcionales.
  b.data.tasks = b.data.tasks.map((t) => ({ ...t, spawnedTaskId: t.spawnedTaskId ?? null }))
  return { ...b, schemaVersion: SCHEMA_VERSION }
}

// ── Importar ─────────────────────────────────────────────────────────────

/**
 * Reemplaza todos los datos por los del respaldo, en una sola transacción.
 * Antes guarda una copia del estado actual para poder deshacer.
 */
export async function importBackup(backup: Backup, db: AppDB = defaultDb) {
  const current = await createBackup(db)
  await db.transaction('rw', [db.lists, db.tasks, db.habits, db.habitLogs, db.meta], async () => {
    await db.meta.put({ key: PRE_IMPORT_KEY, value: current })
    await writeData(backup.data, db)
  })
}

export async function undoImport(db: AppDB = defaultDb): Promise<boolean> {
  const saved = await db.meta.get(PRE_IMPORT_KEY)
  if (!saved) return false
  const backup = parseBackup(saved.value)
  await db.transaction('rw', [db.lists, db.tasks, db.habits, db.habitLogs, db.meta], async () => {
    await writeData(backup.data, db)
    await db.meta.delete(PRE_IMPORT_KEY)
  })
  return true
}

export async function hasUndoImport(db: AppDB = defaultDb) {
  return !!(await db.meta.get(PRE_IMPORT_KEY))
}

async function writeData(data: BackupData, db: AppDB) {
  await Promise.all([db.lists.clear(), db.tasks.clear(), db.habits.clear(), db.habitLogs.clear()])
  await db.lists.bulkAdd(data.lists)
  await db.tasks.bulkAdd(data.tasks)
  await db.habits.bulkAdd(data.habits)
  await db.habitLogs.bulkAdd(data.habitLogs)
}

// ── Recordatorio ─────────────────────────────────────────────────────────

export const BACKUP_REMINDER_DAYS = 7

export async function markBackupDone(db: AppDB = defaultDb, when = new Date()) {
  await db.meta.put({ key: LAST_BACKUP_KEY, value: when.toISOString() })
}

export async function getLastBackupAt(db: AppDB = defaultDb): Promise<string | null> {
  const m = await db.meta.get(LAST_BACKUP_KEY)
  return typeof m?.value === 'string' ? m.value : null
}

/** Recordar respaldo si hay datos y nunca se hizo o pasaron 7+ días. */
export function needsBackupReminder(lastBackupAt: string | null, hasData: boolean, now = new Date()): boolean {
  if (!hasData) return false
  if (!lastBackupAt) return true
  return now.getTime() - new Date(lastBackupAt).getTime() >= BACKUP_REMINDER_DAYS * 86_400_000
}
