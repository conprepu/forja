import { useRef, useState, type PointerEvent } from 'react'
import type { List, Task } from '../db/types'
import { deleteTask, setTaskDone } from '../db/repo'
import { formatRelative } from '../lib/dates'
import { ColorDot } from './Group'
import { IconCheck, IconRepeat } from './icons'
import s from './TaskRow.module.css'

export const PRIORITY_COLOR = ['gray', 'blue', 'orange', 'red'] as const
export const PRIORITY_LABEL = ['Ninguna', 'Baja', 'Media', 'Alta'] as const

const ACTION_W = 80

type Props = {
  task: Task
  today: string
  onOpen: (task: Task) => void
  /** Si se pasa, muestra la lista a la que pertenece. */
  list?: List
}

export function TaskRow({ task, today, onOpen, list }: Props) {
  const done = !!task.completedAt
  const overdue = !done && !!task.dueDate && task.dueDate < today
  const [dx, setDx] = useState(0)
  const [dragging, setDragging] = useState(false)
  const drag = useRef<{ x: number; y: number; start: number; axis?: 'x' | 'y' } | null>(null)
  const suppressClick = useRef(false)

  function onPointerDown(e: PointerEvent) {
    drag.current = { x: e.clientX, y: e.clientY, start: dx }
    suppressClick.current = false
  }
  function onPointerMove(e: PointerEvent) {
    const d = drag.current
    if (!d) return
    const mx = e.clientX - d.x
    const my = e.clientY - d.y
    if (!d.axis && Math.hypot(mx, my) > 8) d.axis = Math.abs(mx) > Math.abs(my) ? 'x' : 'y'
    if (d.axis !== 'x') return
    suppressClick.current = true
    setDragging(true)
    setDx(Math.max(-ACTION_W * 1.5, Math.min(0, d.start + mx)))
  }
  function onPointerUp() {
    drag.current = null
    if (!dragging) return
    setDragging(false)
    setDx((v) => (v < -ACTION_W / 2 ? -ACTION_W : 0))
  }
  function onClickContent() {
    if (suppressClick.current) return
    if (dx !== 0) return setDx(0)
    onOpen(task)
  }

  return (
    <div className={s.wrap}>
      <button type="button" className={s.delete} onClick={() => deleteTask(task.id)} aria-label={`Eliminar ${task.title}`} tabIndex={dx ? 0 : -1}>
        Eliminar
      </button>
      <div
        className={s.row}
        style={{ transform: `translateX(${dx}px)`, transition: dragging ? 'none' : undefined }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <button
          type="button"
          className={s.check}
          data-done={done}
          style={{ ['--c' as string]: `var(--${PRIORITY_COLOR[task.priority]})` }}
          onClick={() => setTaskDone(task.id, !done)}
          aria-label={done ? 'Marcar como pendiente' : 'Completar'}
          aria-pressed={done}
        >
          {done && <IconCheck width={14} height={14} />}
        </button>
        <button type="button" className={s.content} onClick={onClickContent}>
          <span className={s.title} data-done={done}>{task.title}</span>
          {(task.dueDate || list || task.notes) && (
            <span className={s.meta}>
              {task.dueDate && (
                <span data-overdue={overdue}>
                  {formatRelative(task.dueDate, today)}{task.dueTime && `, ${task.dueTime}`}
                </span>
              )}
              {task.recurrence && <IconRepeat />}
              {list && <span className={s.list}><ColorDot color={list.color} size={7} /> {list.name}</span>}
              {!task.dueDate && !list && task.notes && <span className={s.notes}>{task.notes}</span>}
            </span>
          )}
        </button>
      </div>
    </div>
  )
}
