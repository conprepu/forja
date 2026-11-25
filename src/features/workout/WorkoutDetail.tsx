import { useState } from 'react'
import { db } from '../../db/db'
import type { Workout } from '../../db/schema'
import { createRoutineFromWorkout, deleteWorkout } from '../../db/workouts'
import { exerciseLabel } from '../../lib/muscles'
import { fmtN, fmtT } from '../../lib/time'
import { routineItemsFromWorkout, setLabel, workoutVolume } from '../../lib/workout'
import { btn, btnDanger, btnPri } from '../../ui/cls'
import { Sheet } from '../../ui/Sheet'
import { countsVolume, useExerciseMap, useUnits } from './hooks'
import { prevText } from './SetRow'
import { useWorkout } from './store'
import { WorkoutAnalysis } from './WorkoutAnalysis'

const dateText = (ms: number) => new Date(ms).toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' })

export function WorkoutDetail({ workout, onClose, canStart }: { workout: Workout | null; onClose: () => void; canStart: boolean }) {
  const exercises = useExerciseMap()
  const { unitOf } = useUnits()
  const [saved, setSaved] = useState(false)
  const close = () => {
    setSaved(false)
    onClose()
  }
  const w = workout

  return (
    <Sheet open={!!w} onClose={close} title={w?.name ?? 'Entreno'}>
      {w && (
        <div className="grid gap-3">
          <p className="text-sm text-mut">
            {dateText(w.startedAt)} · {fmtT((w.endedAt - w.startedAt) / 1000)} ·{' '}
            {fmtN(workoutVolume(w.items.map((i) => ({ exerciseId: i.exerciseId, sets: i.sets })), (id) => countsVolume(exercises.get(id))))} kg
          </p>
          <WorkoutAnalysis workout={w} />
          {w.items.map((it, k) => {
            const ex = exercises.get(it.exerciseId)
            return (
              <section key={k} className="hud p-4">
                <h3 className="text-accfg">{ex ? exerciseLabel(ex) : it.exerciseId}</h3>
                {it.note && <p className="text-sm text-mut">{it.note}</p>}
                <ol className="mt-2 grid gap-1">
                  {it.sets.map((s, j) => (
                    <li key={j} className="flex justify-between text-sm">
                      <span className="font-num font-bold text-mut">{setLabel(it.sets, j)}</span>
                      <span className="font-num font-bold">{prevText(ex, s, unitOf(it.exerciseId))}{s.rpe != null ? ` @${s.rpe}` : ''}</span>
                    </li>
                  ))}
                </ol>
              </section>
            )
          })}
          <button
            type="button"
            className={btnPri}
            disabled={!canStart}
            onClick={() => {
              useWorkout.getState().startFromWorkout(w)
              close()
            }}
          >
            {canStart ? 'Repetir este entreno' : 'Ya tienes un entreno en curso'}
          </button>
          <button
            type="button"
            className={btn}
            disabled={saved}
            onClick={async () => {
              await createRoutineFromWorkout(db, w, routineItemsFromWorkout(w))
              setSaved(true)
            }}
          >
            {saved ? 'Rutina guardada ✓' : 'Guardar como rutina'}
          </button>
          <button
            type="button"
            className={btnDanger}
            onClick={async () => {
              if (!window.confirm('¿Eliminar este entreno? No se puede deshacer.')) return
              await deleteWorkout(db, w.id)
              close()
            }}
          >
            Eliminar entreno
          </button>
        </div>
      )}
    </Sheet>
  )
}
