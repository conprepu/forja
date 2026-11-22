const DAY = 86_400_000

/** Días enteros desde el último respaldo; null si nunca se hizo. */
export const backupAgeDays = (lastAt: number | null, now: number): number | null => (lastAt == null ? null : Math.max(0, Math.floor((now - lastAt) / DAY)))

/** Avisar si hay datos y el último respaldo es viejo (o nunca se hizo). Sin datos no hay nada que respaldar. */
export function needsBackup(lastAt: number | null, hasData: boolean, now: number, maxDays = 7): boolean {
  if (!hasData) return false
  const age = backupAgeDays(lastAt, now)
  return age == null || age >= maxDays
}

export function backupLabel(lastAt: number | null, now: number): string {
  const age = backupAgeDays(lastAt, now)
  if (age == null) return 'Aún no has hecho un respaldo.'
  if (age === 0) return 'Último respaldo: hoy.'
  return `Último respaldo: hace ${age} ${age === 1 ? 'día' : 'días'}.`
}
