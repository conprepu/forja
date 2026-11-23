import { useMemo, useState } from 'react'
import { formatShort } from '../../lib/dates'
import { exerciseLabel } from '../../lib/muscles'
import { exerciseCounts, exerciseSeries, seriesBests, type ExercisePoint } from '../../lib/progress'
import { card, chip, field } from '../../ui/cls'
import { useExerciseMap } from '../workout/hooks'
import { LineSeries } from './charts'
import { useWorkouts } from './hooks'

type Metric = 'e1rm' | 'weight' | 'volume' | 'reps'
const METRICS: Record<Metric, { label: string; unit: string }> = {
  e1rm: { label: '1RM estimado', unit: 'kg' },
  weight: { label: 'Peso máximo', unit: 'kg' },
  volume: { label: 'Volumen', unit: 'kg' },
  reps: { label: 'Repeticiones', unit: '' },
}
const r1 = (n: number) => Math.round(n * 10) / 10

export function ExercisesTab() {
  const { workouts, loaded } = useWorkouts()
  const exercises = useExerciseMap()
  const [picked, setPicked] = useState('')
  const [metric, setMetric] = useState<Metric>('e1rm')

  const options = useMemo(
    () =>
      [...exerciseCounts(workouts)]
        .map(([id, n]) => ({ id, n, ex: exercises.get(id) }))
        .filter((o) => o.ex)
        .sort((a, b) => b.n - a.n),
    [workouts, exercises],
  )
  const id = options.some((o) => o.id === picked) ? picked : (options[0]?.id ?? '')
  const ex = exercises.get(id)
  const series = useMemo(() => (ex ? exerciseSeries(workouts, ex) : []), [workouts, ex])
  const bests = seriesBests(series)
  const available = (Object.keys(METRICS) as Metric[]).filter((m) => bests[m] !== undefined)
  const active: Metric = available.includes(metric) ? metric : (available[0] ?? 'e1rm')
  const data = series.map((p) => ({ fecha: formatShort(p.date), valor: r1(p[active] ?? 0) }))

  if (loaded && options.length === 0) {
    return <div className={`${card} text-center text-mut`}>Tus gráficas por ejercicio aparecerán después de tu primer entreno.</div>
  }
  if (!ex) return null

  return (
    <div>
      <label className="grid gap-1 text-sm text-mut">
        Ejercicio
        <select className={`${field} text-ink`} value={id} onChange={(e) => setPicked(e.target.value)}>
          {options.map((o) => (
            <option key={o.id} value={o.id}>{exerciseLabel(o.ex!)} · {o.n} {o.n === 1 ? 'vez' : 'veces'}</option>
          ))}
        </select>
      </label>

      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none]" role="group" aria-label="Métrica">
        {available.map((m) => (
          <button key={m} type="button" aria-pressed={active === m} className={`${chip} ${active === m ? 'bg-ink text-bg' : ''}`} onClick={() => setMetric(m)}>
            {METRICS[m].label}
          </button>
        ))}
      </div>

      <section className={card} aria-label={`Gráfica de ${METRICS[active].label}`}>
        {series.length < 2 && <p className="mb-1 text-xs text-mut">Con dos entrenos o más se ve la tendencia.</p>}
        <LineSeries data={data} xKey="fecha" yKey="valor" name={METRICS[active].label} unit={METRICS[active].unit} label={`${METRICS[active].label} de ${ex.name} a lo largo del tiempo`} />
      </section>

      <section className={card} aria-label="Récords">
        <h3>Récords</h3>
        <dl className="mt-2 grid grid-cols-2 gap-2">
          {available.map((m) => (
            <div key={m} className="cut-sm bg-soft p-2.5">
              <dt className="text-xs text-mut">{METRICS[m].label}</dt>
              <dd className="font-num text-xl font-extrabold">{r1(bests[m]!)}{METRICS[m].unit ? ` ${METRICS[m].unit}` : ''}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className={card} aria-label="Últimas veces">
        <h3>Últimas veces</h3>
        <ul className="mt-1">
          {[...series].reverse().slice(0, 8).map((p: ExercisePoint) => (
            <li key={p.workoutId} className="flex justify-between border-t border-line py-2 first:border-t-0">
              <span className="text-mut">{formatShort(p.date)}</span>
              <span className="font-num font-bold">{r1(p[active] ?? 0)}{METRICS[active].unit ? ` ${METRICS[active].unit}` : ''}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
