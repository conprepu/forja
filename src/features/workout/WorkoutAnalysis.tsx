import { useMemo } from 'react'
import type { Workout } from '../../db/schema'
import { analyzeWorkout, TIP_TEXT, type ExerciseAnalysis, type Trend } from '../../lib/analysis'
import { fmtN } from '../../lib/time'
import { fmtWeight } from '../../lib/units'
import { useWorkouts } from '../progress/hooks'
import { useExerciseMap, useUnits } from './hooks'

const TREND: Record<Trend, { icon: string; word: string; cls: string }> = {
  sube: { icon: '▲', word: 'Sube', cls: 'text-ok' },
  igual: { icon: '=', word: 'Igual', cls: 'text-mut' },
  baja: { icon: '▼', word: 'Baja', cls: 'text-warn' },
  nuevo: { icon: '●', word: 'Nuevo', cls: 'text-cy' },
}

const sign = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(Math.round(n))} %`

/** "80 kg × 8" / "135 lb × 8" / "12 reps". */
function topText(e: ExerciseAnalysis, unit: 'kg' | 'lb'): string {
  if (!e.top) return '—'
  if (e.type === 'time') return `${e.top.reps} s`
  return e.top.weight > 0 ? `${fmtWeight(e.top.weight, unit)} × ${e.top.reps}` : `${e.top.reps} reps`
}

/** Análisis del entreno: comparación con la última vez, músculos trabajados, avance por ejercicio y qué hacer después. */
export function WorkoutAnalysis({ workout, compact = false }: { workout: Workout; compact?: boolean }) {
  const { workouts } = useWorkouts()
  const exercises = useExerciseMap()
  const { unitOf } = useUnits()
  const a = useMemo(() => analyzeWorkout(workout, workouts, (id) => exercises.get(id)), [workout, workouts, exercises])
  const delta = a.compare?.volumePct
  const notes = compact ? a.notes.slice(0, 3) : a.notes

  return (
    <section aria-label="Análisis del entreno" className="hud p-4">
      <h3 className="text-accfg">Análisis del día</h3>

      <dl className="mt-2 grid grid-cols-2 gap-2">
        <div className="cut-sm bg-soft p-2.5">
          <dt className="text-xs text-mut">Series de trabajo</dt>
          <dd className="font-num text-xl font-extrabold">
            {a.workSets}
            {a.warmupSets > 0 && <span className="text-sm font-semibold text-mut"> +{a.warmupSets} cal.</span>}
          </dd>
        </div>
        <div className="cut-sm bg-soft p-2.5">
          <dt className="text-xs text-mut">Volumen</dt>
          <dd className="font-num text-xl font-extrabold">
            {fmtN(a.volume)} <span className="text-sm font-semibold text-mut">kg</span>
            {delta != null && Math.abs(delta) >= 3 && <span className={`ml-1 text-sm ${delta > 0 ? 'text-ok' : 'text-warn'}`}>{delta > 0 ? '▲' : '▼'} {Math.abs(Math.round(delta))} %</span>}
          </dd>
        </div>
        <div className="cut-sm bg-soft p-2.5">
          <dt className="text-xs text-mut">Duración</dt>
          <dd className="font-num text-xl font-extrabold">{Math.round(a.durationMin)} <span className="text-sm font-semibold text-mut">min</span></dd>
        </div>
        <div className="cut-sm bg-soft p-2.5">
          <dt className="text-xs text-mut">Ritmo</dt>
          <dd className="font-num text-xl font-extrabold">{a.minPerSet ?? '—'} <span className="text-sm font-semibold text-mut">min/serie</span></dd>
        </div>
      </dl>

      {notes.length > 0 && (
        <ul className="mt-3 grid gap-1.5 text-sm">
          {notes.map((n) => (
            <li key={n} className="flex gap-2">
              <span aria-hidden="true" className="text-cy">›</span>
              <span>{n}</span>
            </li>
          ))}
        </ul>
      )}

      {!compact && a.muscles.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm text-mut">Series por músculo</h4>
          <ul className="mt-1.5 grid gap-1.5">
            {a.muscles.map((m) => (
              <li key={m.muscle} className="grid grid-cols-[88px_1fr_28px] items-center gap-2 text-sm">
                <span className="truncate">{m.muscle}</span>
                <span className="h-2 bg-soft" aria-hidden="true">
                  <span className="block h-full bg-cy" style={{ width: `${Math.max(6, Math.round(m.share * 100))}%` }} />
                </span>
                <b className="text-right font-num">{m.sets}</b>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4">
        <h4 className="text-sm text-mut">Contra la última vez</h4>
        <ul className="mt-1">
          {a.exercises.map((e) => {
            const t = TREND[e.trend]
            return (
              <li key={e.exerciseId} className="border-t border-line py-2 first:border-t-0">
                <div className="flex items-baseline gap-2">
                  <span className="min-w-0 flex-1 truncate font-semibold">{e.name}</span>
                  <span className={`shrink-0 font-num font-bold ${t.cls}`}>
                    <span aria-hidden="true">{t.icon} </span>
                    {t.word}
                    {e.change !== null && e.trend !== 'igual' ? ` ${sign(e.change)}` : ''}
                  </span>
                </div>
                <p className="text-xs text-mut">
                  {e.workSets} {e.workSets === 1 ? 'serie' : 'series'} · mejor: {topText(e, unitOf(e.exerciseId))}
                </p>
                {e.tip && !compact && <p className="mt-0.5 text-xs text-accfg">{TIP_TEXT[e.tip]}</p>}
              </li>
            )
          })}
        </ul>
      </div>

      <p className="mt-2 text-xs text-mut">Reglas simples sobre tu propio historial; no sustituyen a un entrenador.</p>
    </section>
  )
}
