import { useEffect, useState } from 'react'
import { db } from '../../db/db'
import { createRoutineFromWorkout, type FinishResult } from '../../db/workouts'
import { haptic } from '../../lib/haptics'
import { PR_LABEL } from '../../lib/prs'
import { fmtN, fmtT } from '../../lib/time'
import { fmtWeight, type WeightUnit } from '../../lib/units'
import { routineItemsFromWorkout } from '../../lib/workout'
import { btn, btnPri } from '../../ui/cls'
import { Sheet } from '../../ui/Sheet'
import { useUnits } from './hooks'
import { WorkoutAnalysis } from './WorkoutAnalysis'

const fmtPr = (kind: string, v: number, unit: WeightUnit) => (kind === 'reps' ? `${v}` : fmtWeight(v, unit))

export function FinishSummary({ result, onClose }: { result: FinishResult | null; onClose: () => void }) {
  const { unitOf } = useUnits()
  const [saved, setSaved] = useState(false)
  const close = () => {
    setSaved(false)
    onClose()
  }
  const w = result?.workout
  const prCount = result?.prs.length ?? 0
  useEffect(() => {
    if (result) haptic(prCount > 0 ? 'success' : 'tap')
  }, [result, prCount])

  return (
    <Sheet open={!!result} onClose={close} title="¡Entreno terminado!">
      {result && w && (
        <div className="grid gap-3">
          <p className="text-mut">{w.name}</p>
          <dl className="grid grid-cols-3 gap-2">
            {[
              ['Duración', fmtT(result.durationSec)],
              ['Volumen', `${fmtN(result.volume)} kg`],
              ['Series', String(result.sets)],
            ].map(([k, v]) => (
              <div key={k} className="cut-sm border border-line bg-card px-2.5 py-2">
                <dt className="text-xs text-mut">{k}</dt>
                <dd className="whitespace-nowrap font-num text-xl font-extrabold">{v}</dd>
              </div>
            ))}
          </dl>

          {result.prs.length > 0 ? (
            <section aria-label="Récords nuevos" className="hud p-4">
              <h3 className="text-c">🏆 {result.prs.length === 1 ? 'Récord nuevo' : `${result.prs.length} récords nuevos`}</h3>
              <ul className="mt-2 grid gap-1.5">
                {result.prs.map((p) => (
                  <li key={`${p.exerciseId}-${p.kind}`} className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 truncate">{p.exerciseName} <span className="text-xs text-mut">· {PR_LABEL[p.kind]}</span></span>
                    <b className="font-num">{fmtPr(p.kind, p.value, unitOf(p.exerciseId))}</b>
                  </li>
                ))}
              </ul>
            </section>
          ) : (
            <p className="text-sm text-mut">Sin récords esta vez. Se registran al superar tu historial en cada ejercicio.</p>
          )}

          <WorkoutAnalysis workout={w} compact />

          {!w.routineId && (
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
          )}
          <button type="button" className={btnPri} onClick={close}>
            Listo
          </button>
        </div>
      )}
    </Sheet>
  )
}
