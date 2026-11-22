import { useLiveQuery } from 'dexie-react-hooks'
import { useNavigate } from 'react-router'
import { db } from '../../db/db'
import { addWater } from '../../db/nutrition'
import { getLastBackup } from '../../db/prefs'
import { backupLabel, needsBackup } from '../../lib/backupReminder'
import { formatDay, todayStr } from '../../lib/dates'
import { ML_PER_GLASS, remaining, sumMacros } from '../../lib/nutrition'
import { greeting, suggestRoutine, weekWorkoutDays } from '../../lib/today'
import { btn, btnPri, card } from '../../ui/cls'
import { Ring } from '../../ui/Ring'
import { Screen } from '../../ui/Screen'
import { useDay } from '../nutrition/hooks'
import { useExerciseMap } from '../workout/hooks'
import { useWorkout } from '../workout/store'
import { useWorkouts } from '../progress/hooks'

export function TodayScreen() {
  const navigate = useNavigate()
  const date = todayStr()
  const exercises = useExerciseMap()
  const routines = useLiveQuery(() => db.routines.orderBy('order').toArray(), [])
  const { workouts } = useWorkouts()
  const active = useWorkout((s) => s.active)
  const startFromRoutine = useWorkout((s) => s.startFromRoutine)
  const startEmpty = useWorkout((s) => s.startEmpty)
  const { entries, goals, waterMl } = useDay(date)

  const lastBackup = useLiveQuery(() => getLastBackup(db), [])
  const hasDiary = useLiveQuery(async () => (await db.diary.count()) > 0, [])
  // lastBackup es undefined mientras carga: no se avisa hasta saberlo
  const remind = lastBackup !== undefined && hasDiary !== undefined && needsBackup(lastBackup, workouts.length > 0 || hasDiary, Date.now())

  const next = suggestRoutine(routines ?? [])
  const last = workouts[workouts.length - 1]
  const eaten = sumMacros(entries)
  const left = remaining(goals, eaten)
  const weekDays = weekWorkoutDays(workouts, date)
  const doneToday = workouts.some((w) => new Date(w.startedAt).toLocaleDateString('sv-SE') === date)

  const go = (start?: () => void) => () => {
    start?.()
    void navigate('/entreno')
  }

  return (
    <Screen title="Hoy">
      <p className="-mt-1 text-mut">
        {greeting(new Date().getHours())} · {formatDay(date)}
      </p>

      {remind && (
        <section className={`${card} border-warn`} aria-label="Recordatorio de respaldo">
          <p className="font-semibold">Haz un respaldo de tus datos</p>
          <p className="mt-1 text-sm text-mut">{backupLabel(lastBackup ?? null, Date.now())} Tus datos viven solo en este teléfono.</p>
          <button type="button" className={`${btn} mt-3 w-full`} onClick={() => void navigate('/perfil')}>Ir a Respaldo</button>
        </section>
      )}

      <section className={card} aria-labelledby="hoy-entreno">
        <div className="flex items-baseline gap-2">
          <h2 id="hoy-entreno" className="flex-1">Entreno</h2>
          <span className="text-sm text-mut">{weekDays} {weekDays === 1 ? 'día' : 'días'} esta semana</span>
        </div>

        {active ? (
          <>
            <p className="mt-1 text-mut">En curso: <b className="text-ink">{active.name}</b></p>
            <button type="button" className={`${btnPri} mt-3 w-full`} onClick={go()}>Continuar entreno</button>
          </>
        ) : next ? (
          <>
            <p className="mt-1 text-sm text-mut">{doneToday ? 'Ya entrenaste hoy. Lo siguiente en tu rotación:' : 'Te toca:'}</p>
            <h3 className="mt-0.5">{next.name}</h3>
            <p className="mt-1 mb-3 line-clamp-2 text-sm text-mut">
              {next.items.map((it) => exercises.get(it.exerciseId)?.name ?? '…').join(', ') || 'Sin ejercicios'}
            </p>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <button type="button" className={doneToday ? btn : btnPri} onClick={go(() => startFromRoutine(next))}>Empezar {next.name}</button>
              <button type="button" className={btn} onClick={go(() => startEmpty())}>Vacío</button>
            </div>
          </>
        ) : (
          <>
            <p className="mt-1 mb-3 text-mut">Aún no tienes rutinas. Crea una o empieza un entreno vacío.</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" className={btnPri} onClick={go(() => startEmpty())}>Entreno vacío</button>
              <button type="button" className={btn} onClick={go()}>Ir a rutinas</button>
            </div>
          </>
        )}

        {last && !active && (
          <p className="mt-3 text-xs text-mut">
            Último: {last.name} · {new Date(last.startedAt).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'short' })}
          </p>
        )}
      </section>

      <section className={card} aria-labelledby="hoy-comida">
        <div className="flex items-baseline gap-2">
          <h2 id="hoy-comida" className="flex-1">Comida</h2>
          <span className="text-sm text-mut">{entries.length} {entries.length === 1 ? 'registro' : 'registros'}</span>
        </div>

        <div className="mt-3 grid grid-cols-[auto_1fr] items-center gap-4">
          <Ring value={eaten.kcal} goal={goals.kcal} label={`${eaten.kcal} de ${goals.kcal} kcal`} />
          <div className="grid gap-1 text-sm">
            <p>
              <b className="font-num text-xl">{eaten.kcal.toLocaleString('es-MX')}</b> <span className="text-mut">/ {goals.kcal.toLocaleString('es-MX')} kcal</span>
            </p>
            <p className={left.p > 0 ? 'text-p' : 'text-ok'}>
              <b className="font-num">{left.p > 0 ? Math.round(left.p) : '✓'}</b>
              {left.p > 0 ? ' g de proteína te faltan' : ' proteína completa'}
            </p>
            <p className="text-mut">
              <span className="text-c">C {Math.round(eaten.c)}</span> · <span className="text-f">G {Math.round(eaten.f)}</span>
            </p>
          </div>
        </div>

        {entries.length === 0 && <p className="mt-3 text-sm text-mut">Todavía no registras nada hoy. Puedes describir lo que comiste y se calcula solo.</p>}
        <button type="button" className={`${entries.length === 0 ? btnPri : btn} mt-3 w-full`} onClick={() => void navigate('/comida')}>
          Registrar comida
        </button>
      </section>

      <section className={card} aria-labelledby="hoy-agua">
        <div className="flex items-baseline gap-2">
          <h2 id="hoy-agua" className="flex-1">Agua</h2>
          <span className="text-sm text-mut">{waterMl} / {goals.waterMl} ml</span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button type="button" className={btn} onClick={() => void addWater(db, date, ML_PER_GLASS)}>+ 1 vaso</button>
          <button type="button" className={btn} onClick={() => void addWater(db, date, 500)}>+ 500 ml</button>
        </div>
      </section>
    </Screen>
  )
}
