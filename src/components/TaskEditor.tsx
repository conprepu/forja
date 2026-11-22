import { useLiveQuery } from 'dexie-react-hooks'
import { useState } from 'react'
import { db } from '../db/db'
import { createTask, deleteTask, emptyDraft, updateTask, type TaskDraft } from '../db/repo'
import type { Priority, Recurrence, Task } from '../db/types'
import { parseISODate, todayISO, weekday } from '../lib/dates'
import { describeRecurrence } from '../lib/recurrence'
import { Segmented, WeekdayPicker } from './controls'
import { Group, Row } from './Group'
import { PRIORITY_LABEL } from './TaskRow'
import { Sheet } from './Sheet'
import f from './Form.module.css'

type RepeatKind = 'none' | Recurrence['kind']

type Props = {
  /** Tarea a editar; si no hay, se crea una nueva con `initial`. */
  task?: Task
  initial?: Partial<TaskDraft>
  onClose: () => void
}

export function TaskEditor({ task, initial, onClose }: Props) {
  const lists = useLiveQuery(() => db.lists.orderBy('order').toArray(), [])
  const [d, setD] = useState<TaskDraft>(() => {
    if (!task) return { ...emptyDraft(), ...initial }
    const { listId, title, notes, dueDate, dueTime, priority, recurrence } = task
    return { listId, title, notes, dueDate, dueTime, priority, recurrence }
  })
  const [weekDays, setWeekDays] = useState<number[]>(() =>
    d.recurrence?.kind === 'weekly' ? d.recurrence.days : [weekday(d.dueDate ?? todayISO())],
  )
  const set = (patch: Partial<TaskDraft>) => setD((prev) => ({ ...prev, ...patch }))
  const repeat: RepeatKind = d.recurrence?.kind ?? 'none'

  function setRepeat(kind: RepeatKind) {
    const dueDate = d.dueDate ?? todayISO() // repetir exige fecha
    set({ dueDate, recurrence: buildRecurrence(kind, dueDate, weekDays) })
  }

  async function save() {
    const draft: TaskDraft = {
      ...d,
      // el día ancla mensual sigue a la fecha elegida
      recurrence: d.recurrence && d.dueDate ? buildRecurrence(d.recurrence.kind, d.dueDate, weekDays) : null,
    }
    if (task) await updateTask(task.id, draft)
    else await createTask(draft)
    onClose()
  }

  async function remove() {
    if (task) await deleteTask(task.id)
    onClose()
  }

  return (
    <Sheet
      title={task ? 'Editar tarea' : 'Nueva tarea'}
      onCancel={onClose}
      confirm={{ label: task ? 'Guardar' : 'Añadir', onClick: save, disabled: !d.title.trim() }}
    >
      <Group>
        <input
          className={f.title}
          placeholder="Título"
          value={d.title}
          autoFocus={!task}
          enterKeyHint="done"
          onChange={(e) => set({ title: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && d.title.trim() && save()}
          aria-label="Título"
        />
        <textarea className={f.textarea} placeholder="Notas" value={d.notes} onChange={(e) => set({ notes: e.target.value })} aria-label="Notas" />
      </Group>

      <Group>
        <Row detail={
          <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="date"
              className={f.native}
              value={d.dueDate ?? ''}
              data-empty={!d.dueDate}
              onChange={(e) => set(e.target.value ? { dueDate: e.target.value } : { dueDate: null, dueTime: null, recurrence: null })}
              aria-label="Fecha"
            />
          </span>
        }>
          Fecha
        </Row>
        {d.dueDate && (
          <Row detail={
            <input type="time" className={f.native} value={d.dueTime ?? ''} data-empty={!d.dueTime}
              onChange={(e) => set({ dueTime: e.target.value || null })} aria-label="Hora" />
          }>
            Hora
          </Row>
        )}
        {d.dueDate && (
          <Row tone="destructive" onClick={() => set({ dueDate: null, dueTime: null, recurrence: null })}>Quitar fecha</Row>
        )}
      </Group>

      <Group header="Repetir" footer={d.recurrence && d.dueDate ? describeRecurrence(buildRecurrence(d.recurrence.kind, d.dueDate, weekDays)!) : undefined}>
        <Segmented<RepeatKind>
          label="Repetir"
          value={repeat}
          onChange={setRepeat}
          options={[
            { value: 'none', label: 'Nunca' },
            { value: 'daily', label: 'Diaria' },
            { value: 'weekly', label: 'Semanal' },
            { value: 'monthly', label: 'Mensual' },
          ]}
        />
        {repeat === 'weekly' && (
          <WeekdayPicker value={weekDays} onChange={(days) => { setWeekDays(days); set({ recurrence: { kind: 'weekly', days } }) }} />
        )}
      </Group>

      <Group header="Prioridad">
        <Segmented<Priority>
          label="Prioridad"
          value={d.priority}
          onChange={(priority) => set({ priority })}
          options={PRIORITY_LABEL.map((label, i) => ({ value: i as Priority, label }))}
        />
      </Group>

      <Group>
        <Row detail={
          <select className={f.native} value={d.listId} onChange={(e) => set({ listId: e.target.value })} aria-label="Lista">
            {lists?.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
          </select>
        }>
          Lista
        </Row>
      </Group>

      {task && <button type="button" className={f.dangerButton} onClick={remove}>Eliminar tarea</button>}
    </Sheet>
  )
}

function buildRecurrence(kind: RepeatKind, dueDate: string, weekDays: number[]): Recurrence | null {
  switch (kind) {
    case 'none': return null
    case 'daily': return { kind: 'daily' }
    case 'weekly': return { kind: 'weekly', days: weekDays }
    case 'monthly': return { kind: 'monthly', day: parseISODate(dueDate).getDate() }
  }
}
