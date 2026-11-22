import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { Group, Row } from '../components/Group'
import { Screen } from '../components/Screen'
import { db } from '../db/db'
import {
  BACKUP_REMINDER_DAYS, BackupError, backupFileName, createBackup, getLastBackupAt,
  hasUndoImport, importBackup, markBackupDone, parseBackup, undoImport,
} from '../lib/backup'
import { shareOrDownload } from '../lib/share'

const fmtDateTime = new Intl.DateTimeFormat('es', { dateStyle: 'medium', timeStyle: 'short' })

export function SettingsScreen() {
  const fileRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [persisted, setPersisted] = useState<boolean | null>(null)
  const lastBackup = useLiveQuery(() => getLastBackupAt(), [])
  const canUndo = useLiveQuery(() => hasUndoImport(), [])
  const counts = useLiveQuery(async () => ({ tasks: await db.tasks.count(), habits: await db.habits.count() }), [])

  useEffect(() => {
    navigator.storage?.persisted?.().then(setPersisted, () => setPersisted(null))
  }, [])

  async function exportNow() {
    const backup = await createBackup()
    const ok = await shareOrDownload(backupFileName(backup), JSON.stringify(backup, null, 2))
    if (ok) {
      await markBackupDone()
      setStatus('Respaldo exportado.')
    }
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // permitir elegir el mismo archivo otra vez
    if (!file) return
    try {
      const backup = parseBackup(JSON.parse(await file.text()))
      const d = backup.data
      const summary = `${d.lists.length} listas, ${d.tasks.length} tareas, ${d.habits.length} hábitos`
      if (!confirm(`Importar ${summary}?\n\nEsto REEMPLAZA todos tus datos actuales. Podrás deshacerlo desde Ajustes.`)) return
      await importBackup(backup)
      setStatus(`Importado: ${summary}.`)
    } catch (err) {
      setStatus(err instanceof BackupError ? err.message : err instanceof SyntaxError ? 'El archivo no es un JSON válido.' : 'No se pudo importar el respaldo.')
    }
  }

  async function undo() {
    if (!confirm('¿Volver a los datos que tenías antes de la última importación?')) return
    await undoImport()
    setStatus('Importación deshecha.')
  }

  async function requestPersist() {
    const ok = (await navigator.storage?.persist?.()) ?? false
    setPersisted(ok)
    if (!ok) setStatus('Safari no concedió almacenamiento persistente. Instala la app en la pantalla de inicio y haz respaldos con frecuencia.')
  }

  return (
    <Screen title="Ajustes">
      <div style={{ height: 8 }} />
      <Group
        header="Respaldo"
        footer={`Tus datos viven solo en este dispositivo. Exporta un respaldo al menos cada ${BACKUP_REMINDER_DAYS} días y guárdalo en Archivos o iCloud Drive.`}
      >
        <Row detail={lastBackup ? fmtDateTime.format(new Date(lastBackup)) : 'Nunca'}>Último respaldo</Row>
        <Row tone="tint" onClick={exportNow}>Exportar respaldo</Row>
        <Row tone="tint" onClick={() => fileRef.current?.click()}>Importar respaldo…</Row>
        {canUndo && <Row tone="destructive" onClick={undo}>Deshacer última importación</Row>}
      </Group>
      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onFile} />

      {status && <p role="status" style={{ margin: '-16px 16px 24px', fontSize: 13, color: 'var(--tint)' }}>{status}</p>}

      <Group header="Almacenamiento" footer="Con almacenamiento persistente, Safari no borra los datos aunque no abras la app en días.">
        <Row detail={persisted === null ? 'Desconocido' : persisted ? 'Persistente' : 'No persistente'}>Estado</Row>
        {persisted === false && <Row tone="tint" onClick={requestPersist}>Pedir almacenamiento persistente</Row>}
        <Row detail={counts ? `${counts.tasks} tareas · ${counts.habits} hábitos` : ''}>Datos</Row>
      </Group>

      <Group header="Acerca de">
        <Row detail={__APP_VERSION__}>TickTick Private</Row>
      </Group>
    </Screen>
  )
}
