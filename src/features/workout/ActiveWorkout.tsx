import { useState } from 'react'
import type { FinishResult } from '../../db/workouts'
import { fmtN, fmtT } from '../../lib/time'
import { doneSetCount, SET_TYPE_NAME, SET_TYPES, supersetLetter, workoutVolume } from '../../lib/workout'
import { btn, btnDanger, btnPri } from '../../ui/cls'
import { Sheet } from '../../ui/Sheet'
import { useNow } from '../../ui/useNow'
import { useToast } from '../../ui/useToast'
import { ExerciseCard } from './ExerciseCard'
import { ExercisePicker } from './ExercisePicker'
import { countsVolume, useExerciseMap, useUnits } from './hooks'
import { PlateSheet } from './PlateSheet'
import { useWorkout } from './store'
import { WarmupSheet } from './WarmupSheet'

export function ActiveWorkoutView({ onFinished }: { onFinished: (r: FinishResult) => void }) {
  const a = useWorkout((s) => s.active)
  const prev = useWorkout((s) => s.prev)
  const showRpe = useWorkout((s) => s.showRpe)
  const st = useWorkout.getState
  const exercises = useExerciseMap()
  const { unitOf, setUnit } = useUnits()
  const now = useNow(1000)
  const { toast, show } = useToast()

  const [picker, setPicker] = useState(false)
  const [plates, setPlates] = useState(false)
  const [menu, setMenu] = useState<number | null>(null)
  const [warm, setWarm] = useState<number | null>(null)
  const [setMenuAt, setSetMenuAt] = useState<{ i: number; j: number } | null>(null)

  if (!a) return null
  const volume = workoutVolume(
    a.items.map((it) => ({ exerciseId: it.exerciseId, sets: it.sets })),
    (id) => countsVolume(exercises.get(id)),
  )
  const done = doneSetCount(a.items)
  const pending = a.items.reduce((n, it) => n + it.sets.filter((s) => !s.done).length, 0)

  async function onFinish() {
    if (done === 0) {
      if (window.confirm('No marcaste ninguna serie. ¿Descartar el entrenamiento?')) await st().discard()
      return
    }
    if (pending > 0 && !window.confirm(`Tienes ${pending} ${pending === 1 ? 'serie' : 'series'} sin marcar y no se guardarán. ¿Terminar el entrenamiento?`)) return
    const res = await st().finish()
    if (res) onFinished(res)
  }

  const menuItem = menu != null ? a.items[menu] : undefined
  const menuEx = menuItem ? exercises.get(menuItem.exerciseId) : undefined
  const linkedNext = menu != null && !!menuItem?.supersetId && a.items[menu + 1]?.supersetId === menuItem.supersetId
  const warmItem = warm != null ? a.items[warm] : undefined
  const warmEx = warmItem ? exercises.get(warmItem.exerciseId) : undefined
  const warmKg = warmItem?.sets.find((s) => s.type !== 'warmup' && s.weight)?.weight ?? (warm != null ? prev[warmItem?.exerciseId ?? '']?.find((s) => s.type !== 'warmup')?.weight : undefined)

  return (
    <div className="pb-20">
      <header className="sticky top-0 z-10 bg-bg pt-[calc(14px+env(safe-area-inset-top))] pb-2">
        <div className="flex items-center gap-2">
          <input
            aria-label="Nombre del entrenamiento"
            value={a.name}
            onChange={(e) => st().rename(e.target.value)}
            className="min-h-11 min-w-0 flex-1 bg-transparent font-num text-[22px] font-extrabold"
          />
          <button type="button" className={`${btn} w-11 px-0`} aria-label="Calculadora de discos" onClick={() => setPlates(true)}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <circle cx="12" cy="12" r="9" />
              <circle cx="12" cy="12" r="2.5" />
            </svg>
          </button>
          <button type="button" className={btnPri} onClick={() => void onFinish()}>
            Terminar
          </button>
        </div>
        <dl className="mt-2 grid grid-cols-3 gap-2">
          {[
            ['Duración', fmtT((now - a.startedAt) / 1000)],
            ['Volumen', `${fmtN(volume)} kg`],
            ['Series', String(done)],
          ].map(([k, v]) => (
            <div key={k} className="cut-sm border border-line bg-card px-2.5 py-2">
              <dt className="text-xs text-mut">{k}</dt>
              <dd className="whitespace-nowrap font-num text-xl font-extrabold">{v}</dd>
            </div>
          ))}
        </dl>
      </header>

      {a.items.length === 0 && (
        <div className="my-3 hud px-2.5 py-6 text-center text-mut">
          Agrega tu primer ejercicio para empezar.
        </div>
      )}
      {a.items.map((item, i) => (
        <ExerciseCard
          key={`${i}-${item.exerciseId}`}
          item={item}
          i={i}
          ex={exercises.get(item.exerciseId)}
          unit={unitOf(item.exerciseId)}
          onUnit={(u) => void setUnit(item.exerciseId, u)}
          prev={prev[item.exerciseId]}
          showRpe={showRpe}
          superLetter={supersetLetter(a.items, i)}
          onMenu={() => setMenu(i)}
          onSetMenu={(j) => setSetMenuAt({ i, j })}
          onMissingReps={() => show('Escribe las repeticiones')}
        />
      ))}

      <button type="button" className={`${btnPri} mt-2 min-h-[52px] w-full text-[17px]`} onClick={() => setPicker(true)}>
        + Agregar ejercicios
      </button>
      <button
        type="button"
        className={`${btnDanger} mt-2.5 w-full bg-transparent`}
        onClick={() => window.confirm('¿Descartar este entrenamiento? No se guardará nada.') && void st().discard()}
      >
        Descartar entrenamiento
      </button>

      <ExercisePicker open={picker} onClose={() => setPicker(false)} onConfirm={(ids) => st().addExercises(ids)} />
      <PlateSheet open={plates} onClose={() => setPlates(false)} />

      {warm != null && warmItem && (
        <WarmupSheet
          key={warm}
          open
          onClose={() => setWarm(null)}
          exerciseName={warmEx ? warmEx.name : warmItem.exerciseId}
          initialKg={warmKg ?? undefined}
          unit={warmItem ? unitOf(warmItem.exerciseId) : 'kg'}
          onAdd={(sets) => st().insertWarmups(warm, sets)}
        />
      )}

      <Sheet open={menu != null && !!menuItem} onClose={() => setMenu(null)} title={menuEx?.name ?? 'Ejercicio'}>
        {menu != null && menuItem && (
          <div className="grid gap-2">
            {(!menuEx || menuEx.type === 'weight_reps') && (
              <button type="button" className={btn} onClick={() => { setWarm(menu); setMenu(null) }}>
                Calentamiento…
              </button>
            )}
            {linkedNext || (menuItem.supersetId && menu > 0 && a.items[menu - 1]?.supersetId === menuItem.supersetId) ? (
              <button type="button" className={btn} onClick={() => { st().unlink(menu); setMenu(null) }}>
                Quitar de la superserie
              </button>
            ) : null}
            {menu < a.items.length - 1 && !linkedNext && (
              <button type="button" className={btn} onClick={() => { st().linkNext(menu); setMenu(null) }}>
                Unir con el siguiente (superserie)
              </button>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className={btn} disabled={menu === 0} onClick={() => { st().moveExercise(menu, -1); setMenu(null) }}>
                Subir
              </button>
              <button type="button" className={btn} disabled={menu === a.items.length - 1} onClick={() => { st().moveExercise(menu, 1); setMenu(null) }}>
                Bajar
              </button>
            </div>
            <button type="button" className={btn} onClick={() => { st().setShowRpe(!showRpe); setMenu(null) }}>
              {showRpe ? 'Ocultar RPE' : 'Mostrar RPE'}
            </button>
            <button
              type="button"
              className={btnDanger}
              onClick={() => {
                const has = menuItem.sets.some((s) => s.done)
                if (has && !window.confirm('Este ejercicio tiene series marcadas. ¿Quitarlo?')) return
                st().removeExercise(menu)
                setMenu(null)
              }}
            >
              Quitar ejercicio
            </button>
          </div>
        )}
      </Sheet>

      <Sheet open={setMenuAt != null} onClose={() => setSetMenuAt(null)} title="Tipo de serie">
        {setMenuAt && (
          <div className="grid gap-2">
            {SET_TYPES.map((t) => {
              const on = a.items[setMenuAt.i]?.sets[setMenuAt.j]?.type === t
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={on}
                  className={`${btn} ${on ? 'bg-acc text-accink' : ''}`}
                  onClick={() => { st().setSetType(setMenuAt.i, setMenuAt.j, t); setSetMenuAt(null) }}
                >
                  {SET_TYPE_NAME[t]}
                </button>
              )
            })}
            <button
              type="button"
              className={btnDanger}
              onClick={() => { st().removeSet(setMenuAt.i, setMenuAt.j); setSetMenuAt(null) }}
            >
              Eliminar serie
            </button>
          </div>
        )}
      </Sheet>
      {toast}
    </div>
  )
}
