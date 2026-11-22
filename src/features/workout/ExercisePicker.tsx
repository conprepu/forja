import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import { db } from '../../db/db'
import type { Exercise, ExerciseType } from '../../db/schema'
import { EQUIPMENT, exerciseLabel, MUSCLES } from '../../lib/muscles'
import { norm } from '../../lib/text'
import { newId } from '../../lib/workout'
import { btn, btnGhost, btnPri, chip, field } from '../../ui/cls'
import { Sheet } from '../../ui/Sheet'

interface Props {
  open: boolean
  onClose: () => void
  onConfirm: (ids: string[]) => void
}

const KINDS: { label: string; type: ExerciseType; bodyweight?: boolean }[] = [
  { label: 'Peso × reps', type: 'weight_reps' },
  { label: 'Peso corporal (+kg opcional)', type: 'weight_reps', bodyweight: true },
  { label: 'Tiempo', type: 'time' },
  { label: 'Cardio (km y min)', type: 'distance' },
]

export function ExercisePicker({ open, onClose, onConfirm }: Props) {
  const all = useLiveQuery(() => db.exercises.orderBy('name').toArray(), [])
  const [q, setQ] = useState('')
  const [muscle, setMuscle] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', muscle: 'Pecho', equipment: 'Barra', kind: 0 })

  const list = useMemo(() => {
    const nq = norm(q.trim())
    return (all ?? []).filter(
      (e) => (!muscle || e.muscle === muscle) && (!nq || norm(`${e.name} ${e.equipment}`).includes(nq)),
    )
  }, [all, q, muscle])

  const close = () => {
    setQ('')
    setMuscle('')
    setSelected([])
    setCreating(false)
    onClose()
  }

  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]))

  async function createExercise() {
    const name = form.name.trim()
    if (!name) return
    const kind = KINDS[form.kind] ?? KINDS[0]!
    const ex: Exercise = {
      id: `x${newId().slice(0, 8)}`,
      name,
      muscle: form.muscle,
      equipment: form.equipment,
      type: kind.type,
      ...(kind.bodyweight ? { bodyweight: true } : {}),
      custom: true,
    }
    await db.exercises.put(ex)
    setSelected((s) => [...s, ex.id])
    setForm((f) => ({ ...f, name: '' }))
    setCreating(false)
  }

  return (
    <Sheet open={open} onClose={close} title="Ejercicios">
      {creating ? (
        <div className="grid gap-3">
          <label className="grid gap-1 text-sm text-mut">
            Nombre
            <input className={`${field} text-ink`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej. Press landmine" />
          </label>
          <label className="grid gap-1 text-sm text-mut">
            Músculo
            <select className={`${field} text-ink`} value={form.muscle} onChange={(e) => setForm({ ...form, muscle: e.target.value })}>
              {MUSCLES.map((m) => <option key={m}>{m}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm text-mut">
            Equipo
            <select className={`${field} text-ink`} value={form.equipment} onChange={(e) => setForm({ ...form, equipment: e.target.value })}>
              {EQUIPMENT.map((m) => <option key={m}>{m}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm text-mut">
            Tipo
            <select className={`${field} text-ink`} value={form.kind} onChange={(e) => setForm({ ...form, kind: Number(e.target.value) })}>
              {KINDS.map((k, i) => <option key={k.label} value={i}>{k.label}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button type="button" className={btn} onClick={() => setCreating(false)}>Cancelar</button>
            <button type="button" className={btnPri} disabled={!form.name.trim()} onClick={() => void createExercise()}>Crear</button>
          </div>
        </div>
      ) : (
        <>
          <input
            type="search"
            className={field}
            placeholder="Buscar ejercicio"
            aria-label="Buscar ejercicio"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="-mx-4 mt-2 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none]" role="group" aria-label="Filtrar por músculo">
            <button type="button" className={`${chip} ${muscle === '' ? 'bg-ink text-bg' : ''}`} onClick={() => setMuscle('')}>Todos</button>
            {MUSCLES.map((m) => (
              <button key={m} type="button" className={`${chip} ${muscle === m ? 'bg-ink text-bg' : ''}`} aria-pressed={muscle === m} onClick={() => setMuscle(muscle === m ? '' : m)}>
                {m}
              </button>
            ))}
          </div>
          <ul>
            {list.map((e) => {
              const on = selected.includes(e.id)
              return (
                <li key={e.id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(e.id)}
                    className="flex min-h-14 w-full items-center gap-3 border-t border-line py-2 text-left"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold">{exerciseLabel(e)}</span>
                      <span className="block text-xs text-mut">{e.muscle}{e.custom ? ' · propio' : ''}</span>
                    </span>
                    <span aria-hidden="true" className={`grid h-7 w-7 place-items-center rounded-full border-2 ${on ? 'border-acc bg-acc text-accink' : 'border-line'}`}>
                      {on ? '✓' : ''}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
          {all && list.length === 0 && <p className="py-6 text-center text-mut">Sin resultados.</p>}
          <div className="sticky bottom-0 -mx-4 mt-2 grid gap-2 bg-bg px-4 pt-2">
            <button type="button" className={btnGhost} onClick={() => setCreating(true)}>+ Crear ejercicio propio</button>
            <button
              type="button"
              className={btnPri}
              disabled={selected.length === 0}
              onClick={() => {
                onConfirm(selected)
                close()
              }}
            >
              {selected.length ? `Agregar (${selected.length})` : 'Elige ejercicios'}
            </button>
          </div>
        </>
      )}
    </Sheet>
  )
}
