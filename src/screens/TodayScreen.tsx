import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { EmptyState, Group } from '../components/Group'
import { IconPlus } from '../components/icons'
import { Screen } from '../components/Screen'
import { TaskEditor } from '../components/TaskEditor'
import { TaskRow } from '../components/TaskRow'
import { db } from '../db/db'
import type { List, Task } from '../db/types'
import { parseISODate } from '../lib/dates'
import { selectToday } from '../lib/today'
import { useToday } from '../lib/useToday'
import { TodayHabits } from './TodayHabits'
import s from './screens.module.css'

const fmtLong = new Intl.DateTimeFormat('es', { weekday: 'long', day: 'numeric', month: 'long' })

export function TodayScreen() {
  const today = useToday()
  const [editing, setEditing] = useState<Task | 'new' | null>(null)
  const [showDone, setShowDone] = useState(false)
  const tasks = useLiveQuery(() => db.tasks.where('dueDate').belowOrEqual(today).toArray(), [today])
  const lists = useLiveQuery(async () => new Map<string, List>((await db.lists.toArray()).map((l) => [l.id, l])), [])

  const { overdue, dueToday, doneToday } = selectToday(tasks ?? [], today)
  const row = (t: Task) => <TaskRow key={t.id} task={t} today={today} list={lists?.get(t.listId)} onOpen={setEditing} />

  return (
    <Screen
      title="Hoy"
      action={<button className={s.iconBtn} onClick={() => setEditing('new')} aria-label="Nueva tarea"><IconPlus /></button>}
    >
      <p className={s.subtitle}>{fmtLong.format(parseISODate(today))}</p>

      {overdue.length > 0 && <Group header="Vencidas">{overdue.map(row)}</Group>}

      {dueToday.length > 0 && <Group header="Hoy">{dueToday.map(row)}</Group>}

      {tasks && overdue.length + dueToday.length === 0 && (
        <EmptyState title="Nada pendiente hoy" hint="Toca + para añadir una tarea para hoy." />
      )}

      <TodayHabits today={today} />

      {doneToday.length > 0 && (
        <Group header={
          <button className={s.disclosure} onClick={() => setShowDone((v) => !v)} aria-expanded={showDone}>
            Completadas hoy ({doneToday.length}) <span>{showDone ? 'Ocultar' : 'Mostrar'}</span>
          </button>
        }>
          {showDone ? doneToday.map(row) : null}
        </Group>
      )}

      {editing && (
        <TaskEditor task={editing === 'new' ? undefined : editing} initial={{ dueDate: today }} onClose={() => setEditing(null)} />
      )}
    </Screen>
  )
}
