import { useState } from 'react'
import { createHabit, deleteHabit, updateHabit, type HabitDraft } from '../db/repo'
import type { Habit, HabitSchedule } from '../db/types'
import { describeSchedule } from '../lib/habits'
import { ColorPicker, Segmented, Stepper, WeekdayPicker } from './controls'
import { Group, Row } from './Group'
import { Sheet } from './Sheet'
import f from './Form.module.css'

type Kind = HabitSchedule['kind']

export function HabitEditor({ habit, onClose, onDeleted }: { habit?: Habit; onClose: () => void; onDeleted?: () => void }) {
  const [name, setName] = useState(habit?.name ?? '')
  const [color, setColor] = useState<HabitDraft['color']>(habit?.color ?? 'orange')
  const [kind, setKind] = useState<Kind>(habit?.schedule.kind ?? 'daily')
  const [days, setDays] = useState<number[]>(habit?.schedule.kind === 'weekdays' ? habit.schedule.days : [1, 2, 3, 4, 5])
  const [times, setTimes] = useState(habit?.schedule.kind === 'weekly' ? habit.schedule.times : 3)

  const schedule: HabitSchedule =
    kind === 'daily' ? { kind } : kind === 'weekdays' ? { kind, days } : { kind, times }

  async function save() {
    const draft = { name, color, schedule }
    if (habit) await updateHabit(habit.id, draft)
    else await createHabit(draft)
    onClose()
  }

  async function remove() {
    if (!habit || !confirm(`¿Eliminar "${habit.name}" y todo su historial?`)) return
    await deleteHabit(habit.id)
    onDeleted?.()
  }

  return (
    <Sheet title={habit ? 'Editar hábito' : 'Nuevo hábito'} onCancel={onClose} confirm={{ label: habit ? 'Guardar' : 'Crear', onClick: save, disabled: !name.trim() }}>
      <Group>
        <input className={f.field} placeholder="Nombre (p. ej. Leer 20 min)" value={name} autoFocus={!habit} onChange={(e) => setName(e.target.value)} aria-label="Nombre" />
      </Group>

      <Group header="Frecuencia" footer={describeSchedule(schedule) + (kind === 'weekly' ? '. La racha cuenta semanas cumplidas.' : '')}>
        <Segmented<Kind>
          label="Frecuencia"
          value={kind}
          onChange={setKind}
          options={[
            { value: 'daily', label: 'Diario' },
            { value: 'weekdays', label: 'Días' },
            { value: 'weekly', label: 'Veces/semana' },
          ]}
        />
        {kind === 'weekdays' && <WeekdayPicker value={days} onChange={setDays} />}
        {kind === 'weekly' && (
          <Row detail={<Stepper label="Veces por semana" value={times} min={1} max={7} onChange={setTimes} />}>
            {times} {times === 1 ? 'vez' : 'veces'} por semana
          </Row>
        )}
      </Group>

      <Group header="Color">
        <ColorPicker value={color} onChange={setColor} />
      </Group>

      {habit && <button type="button" className={f.dangerButton} onClick={remove}>Eliminar hábito</button>}
    </Sheet>
  )
}
