import { applyTheme, parseTheme, type Theme } from '../lib/theme'
import { setHapticsEnabled } from '../lib/haptics'
import type { ForjaDB } from './db'
import { getSetting, setSetting } from './workouts'

export const getTheme = async (db: ForjaDB): Promise<Theme> => parseTheme(await getSetting<unknown>(db, 'theme', 'auto'))

export async function saveTheme(db: ForjaDB, theme: Theme): Promise<void> {
  await setSetting(db, 'theme', theme)
  applyTheme(theme)
}

export const getHaptics = async (db: ForjaDB): Promise<boolean> => (await getSetting<unknown>(db, 'haptics', true)) !== false

export async function saveHaptics(db: ForjaDB, on: boolean): Promise<void> {
  await setSetting(db, 'haptics', on)
  setHapticsEnabled(on)
}

export async function getLastBackup(db: ForjaDB): Promise<number | null> {
  const v = await getSetting<unknown>(db, 'lastBackupAt', null)
  return typeof v === 'number' ? v : null
}

export const markBackup = (db: ForjaDB, at = Date.now()) => setSetting(db, 'lastBackupAt', at)

/** Aplica tema y vibración guardados; se llama al arrancar, antes de pintar. */
export async function applyPrefs(db: ForjaDB): Promise<void> {
  applyTheme(await getTheme(db))
  setHapticsEnabled(await getHaptics(db))
}
