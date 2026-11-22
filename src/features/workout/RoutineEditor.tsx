import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState } from 'react'
import { db } from '../../db/db'
import type { Routine, RoutineItem } from '../../db/schema'
import { createRoutine, saveRoutine } from '../../db/workouts'
import { exerciseLabel } from '../../lib/muscles'
import { parseDecimal } from '../../lib/units'
import { DEFAULT_REST_SEC, moveItem, normalizeSupersets } from '../../lib/workout'
import { btn, btnPri, field } from '../../ui/cls'
import { Sheet } from '../../ui/Sheet'
import { ExercisePicker } from './ExercisePicker'
import { useExerciseMap } from './hooks'

interface EditItem {
  exerciseId: string
  sets: number
  reps: string
  rest: number
  supersetId?: string
}

const toEdit = (it: RoutineItem): EditItem => ({
  exerciseId: it.exerciseId,
  sets: Math.max(1, it.sets.length),
  reps: it.sets.find((s) => s.targetReps)?.targetReps ?? '',
  rest: it.restSec,
  ...(it.supersetId ? { supersetId: it.supersetId } : {}),
})

const toItem = (e: EditItem): RoutineItem => ({
  exerciseId: e.exerciseId,
  restSec: e.rest,
  ...(e.supersetId ? { supersetId: e.supersetId } : {}),
  sets: Array.from({ length: Math.max(1, e.sets) }, () => ({ type: 'normal' as const, ...(e.reps.trim() ? { targetReps: e.reps.trim() } : {}) })),
})

interface Props {
  open: boolean
  /** Rutina a editar; sin ella se crea una nueva. */
  routine?: Routine | null
  defaultFolderId?: string
  onClose: () => void
}

export function RoutineEditor({ open, routine, defaultFolderId, onClose }: Props) {
  const exercises = useExerciseMap()
  const folders = useLiveQuery(() => db.folders.orderBy('order').toArray(), [])
  const [name, setName] = useState('')
  const [folderId, setFolderId] = useState('')
  const [items, setItems] = useState<EditItem[]>([])
  const [picker, setPicker] = useState(false)

  useEffect(() => {
    if (!open) return
    setName(routine?.name ?? '')
    setFolderId(routine?.folderId ?? defaultFolderId ?? '')
    setItems(routine ? routine.items.map(toEdit) : [])
  }, [open, routine, defaultFolderId])

  const patch = (i: number, p: Partial<EditItem>) => setItems((xs) => xs.map((x, k) => (k === i ? { ...x, ...p } : x)))

  async function save() {
    const data = { name, items: normalizeSupersets(items.map(toItem)), ...(folderId ? { folderId } : {}) }
    if (routine) {
      const { folderId: _old, ...rest } = routine
      await saveRoutine(db, { ...rest, name: name.trim() || routine.name, items: data.items, ...(folderId ? { folderId } : {}) })
    } else {
      await createRoutine(db, data)
    }
    onClose()
  }

  return (
    <>
      <Sheet open={open} onClose={onClose} title={routine ? 'Editar rutina' : 'Nueva rutina'}>
        <div className="grid gap-3">
          <label className="grid gap-1 text-sm text-mut">
            Nombre
            <input className={`${field} text-ink`} value={name} placeholder="Ej. Push" onChange={(e) => setName(e.target.value)} />
          </label>
          {folders && folders.length > 0 && (
            <label className="grid gap-1 text-sm text-mut">
              Carpeta
              <select className={`${field} text-ink`} value={folderId} onChange={(e) => setFolderId(e.target.value)}>
                <option value="">Sin carpeta</option>
                {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </label>
          )}

          {items.length === 0 && <p className="rounded-[18px] border border-line bg-card px-3 py-5 text-center text-mut">Sin ejercicios todavía.</p>}
          {items.map((it, i) => {
            const ex = exercises.get(it.exerciseId)
            return (
              <section key={`${i}-${it.exerciseId}`} className="rounded-[18px] border border-line bg-card p-3" aria-label={ex?.name ?? it.exerciseId}>
                <div className="flex items-center gap-1">
                  <h3 className="min-w-0 flex-1 truncate">{ex ? exerciseLabel(ex) : it.exerciseId}</h3>
                  <button type="button" className={`${btn} w-11 px-0`} aria-label="Subir" disabled={i === 0} onClick={() => setItems((xs) => moveItem(xs, i, -1))}>↑</button>
                  <button type="button" className={`${btn} w-11 px-0`} aria-label="Bajar" disabled={i === items.length - 1} onClick={() => setItems((xs) => moveItem(xs, i, 1))}>↓</button>
                  <button type="button" className={`${btn} w-11 px-0 text-p`} aria-label="Quitar" onClick={() => setItems((xs) => normalizeSupersets(xs.filter((_, k) => k !== i)))}>✕</button>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  <label className="grid gap-1 text-xs text-mut">
                    Series
                    <input className={`${field} text-center text-ink`} inputMode="numeric" value={it.sets} onFocus={(e) => e.target.select()} onChange={(e) => patch(i, { sets: Math.min(20, Number(e.target.value.replace(/\D/g, '')) || 0) })} />
                  </label>
                  <label className="grid gap-1 text-xs text-mut">
                    Reps meta
                    <input className={`${field} text-center text-ink`} value={it.reps} placeholder="8-12" onChange={(e) => patch(i, { reps: e.target.value.replace(/[^\d-]/g, '') })} />
                  </label>
                  <label className="grid gap-1 text-xs text-mut">
                    Descanso (s)
                    <input className={`${field} text-center text-ink`} inputMode="numeric" value={it.rest} onFocus={(e) => e.target.select()} onChange={(e) => patch(i, { rest: parseDecimal(e.target.value) ?? 0 })} />
                  </label>
                </div>
              </section>
            )
          })}

          <button type="button" className={btn} onClick={() => setPicker(true)}>+ Agregar ejercicios</button>
          <button type="button" className={btnPri} onClick={() => void save()}>Guardar</button>
        </div>
      </Sheet>
      <ExercisePicker
        open={picker}
        onClose={() => setPicker(false)}
        onConfirm={(ids) => setItems((xs) => [...xs, ...ids.map((exerciseId): EditItem => ({ exerciseId, sets: 3, reps: '8-12', rest: DEFAULT_REST_SEC }))])}
      />
    </>
  )
}
