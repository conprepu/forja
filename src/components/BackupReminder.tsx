import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { getLastBackupAt, needsBackupReminder } from '../lib/backup'
import { navigate } from '../lib/router'
import { Group, Row } from './Group'

/** Aviso en "Hoy" si hay datos sin respaldar hace 7+ días. */
export function BackupReminder() {
  const show = useLiveQuery(async () => {
    const hasData = (await db.tasks.count()) + (await db.habits.count()) > 0
    return needsBackupReminder(await getLastBackupAt(), hasData)
  }, [])
  if (!show) return null
  return (
    <Group footer="Tus datos solo están en este iPhone.">
      <Row tone="tint" chevron onClick={() => navigate('/settings')}>Haz un respaldo de tus datos</Row>
    </Group>
  )
}
