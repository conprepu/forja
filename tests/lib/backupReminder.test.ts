import { describe, expect, it } from 'vitest'
import { backupAgeDays, backupLabel, needsBackup } from '../../src/lib/backupReminder'

const DAY = 86_400_000
const now = 100 * DAY

describe('backupReminder', () => {
  it('edad en días enteros; nunca = null', () => {
    expect(backupAgeDays(null, now)).toBeNull()
    expect(backupAgeDays(now - 3.9 * DAY, now)).toBe(3)
    expect(backupAgeDays(now + DAY, now)).toBe(0)
  })
  it('sin datos no avisa nunca', () => {
    expect(needsBackup(null, false, now)).toBe(false)
  })
  it('con datos avisa si nunca se respaldó o pasaron 7 días', () => {
    expect(needsBackup(null, true, now)).toBe(true)
    expect(needsBackup(now - 6 * DAY, true, now)).toBe(false)
    expect(needsBackup(now - 7 * DAY, true, now)).toBe(true)
  })
  it('texto', () => {
    expect(backupLabel(null, now)).toBe('Aún no has hecho un respaldo.')
    expect(backupLabel(now, now)).toBe('Último respaldo: hoy.')
    expect(backupLabel(now - DAY, now)).toBe('Último respaldo: hace 1 día.')
    expect(backupLabel(now - 5 * DAY, now)).toBe('Último respaldo: hace 5 días.')
  })
})
