import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { ColorDot, EmptyState, Group, Row } from '../components/Group'
import { IconPlus } from '../components/icons'
import { ListEditor } from '../components/ListEditor'
import { Screen } from '../components/Screen'
import { TaskEditor } from '../components/TaskEditor'
import { TaskRow } from '../components/TaskRow'
import { db } from '../db/db'
import type { ID, Task } from '../db/types'
import { navigate, useRoute } from '../lib/router'
import { sortCompleted, sortTasks } from '../lib/taskSort'
import { useToday } from '../lib/useToday'
import s from './screens.module.css'

export function ListsScreen() {
  const { segments } = useRoute()
  return segments[1] ? <ListDetail id={segments[1]} /> : <ListsIndex />
}

function ListsIndex() {
  const [creating, setCreating] = useState(false)
  const lists = useLiveQuery(() => db.lists.orderBy('order').toArray(), [])
  const counts = useLiveQuery(async () => {
    const map = new Map<ID, number>()
    await db.tasks.filter((t) => !t.completedAt).each((t) => map.set(t.listId, (map.get(t.listId) ?? 0) + 1))
    return map
  }, [])

  return (
    <Screen
      title="Listas"
      action={<button className={s.iconBtn} onClick={() => setCreating(true)} aria-label="Nueva lista"><IconPlus /></button>}
    >
      <Group>
        {lists?.map((l) => (
          <Row key={l.id} leading={<ColorDot color={l.color} />} detail={counts?.get(l.id) || ''} chevron onClick={() => navigate(`/lists/${l.id}`)}>
            {l.name}
          </Row>
        ))}
      </Group>
      {creating && <ListEditor onClose={() => setCreating(false)} />}
    </Screen>
  )
}

function ListDetail({ id }: { id: ID }) {
  const today = useToday()
  const [editing, setEditing] = useState<Task | 'new' | null>(null)
  const [editingList, setEditingList] = useState(false)
  const [showDone, setShowDone] = useState(false)
  const list = useLiveQuery(() => db.lists.get(id), [id])
  const tasks = useLiveQuery(() => db.tasks.where('listId').equals(id).toArray(), [id])

  if (list === undefined && tasks !== undefined) {
    // La lista no existe (borrada o enlace viejo)
    return <Screen title="Lista" back={{ label: 'Listas', onClick: () => navigate('/lists') }}><EmptyState title="Lista no encontrada" /></Screen>
  }

  const pending = sortTasks(tasks?.filter((t) => !t.completedAt) ?? [])
  const done = sortCompleted(tasks?.filter((t) => t.completedAt) ?? [])

  return (
    <Screen
      title={list?.name ?? ''}
      back={{ label: 'Listas', onClick: () => navigate('/lists') }}
      action={
        <>
          <button className={s.textBtn} onClick={() => setEditingList(true)}>Editar</button>
          <button className={s.iconBtn} onClick={() => setEditing('new')} aria-label="Nueva tarea"><IconPlus /></button>
        </>
      }
    >
      <div className={s.spacer} />
      {pending.length === 0 && tasks && (
        <EmptyState title="Todo listo" hint="Toca + para añadir una tarea." />
      )}
      {pending.length > 0 && (
        <Group>
          {pending.map((t) => <TaskRow key={t.id} task={t} today={today} onOpen={setEditing} />)}
        </Group>
      )}
      {done.length > 0 && (
        <Group header={
          <button className={s.disclosure} onClick={() => setShowDone((v) => !v)} aria-expanded={showDone}>
            Completadas ({done.length}) <span>{showDone ? 'Ocultar' : 'Mostrar'}</span>
          </button>
        }>
          {showDone ? done.map((t) => <TaskRow key={t.id} task={t} today={today} onOpen={setEditing} />) : null}
        </Group>
      )}

      {editing && (
        <TaskEditor
          task={editing === 'new' ? undefined : editing}
          initial={{ listId: id }}
          onClose={() => setEditing(null)}
        />
      )}
      {editingList && list && (
        <ListEditor list={list} onClose={() => setEditingList(false)} onDeleted={() => navigate('/lists')} />
      )}
    </Screen>
  )
}
