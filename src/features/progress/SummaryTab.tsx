import { useMemo, useState } from 'react'
import { addDays, addMonths, formatShort, monthKey, monthLabel, startOfWeek, todayStr } from '../../lib/dates'
import { fmtN, fmtT } from '../../lib/time'
import { inRange, muscleSets, summarize, weeklyVolumes } from '../../lib/progress'
import { btn, card } from '../../ui/cls'
import { Segmented } from '../../ui/Segmented'
import { countsVolume, useExerciseMap } from '../workout/hooks'
import { BarSeries } from './charts'
import { useWorkouts } from './hooks'

type Period = 'week' | 'month'

export function SummaryTab() {
  const { workouts, loaded } = useWorkouts()
  const exercises = useExerciseMap()
  const [period, setPeriod] = useState<Period>('week')
  const [offset, setOffset] = useState(0)

  const range = useMemo(() => {
    if (period === 'week') {
      const from = addDays(startOfWeek(todayStr()), 7 * offset)
      return { from, to: addDays(from, 6), label: `${formatShort(from)} – ${formatShort(addDays(from, 6))}` }
    }
    const m = addMonths(monthKey(todayStr()), offset)
    return { from: `${m}-01`, to: addDays(`${addMonths(m, 1)}-01`, -1), label: monthLabel(m) }
  }, [period, offset])

  const counts = (id: string) => countsVolume(exercises.get(id))
  const inPeriod = useMemo(() => inRange(workouts, range.from, range.to), [workouts, range])
  const sum = summarize(inPeriod, counts)
  const muscles = muscleSets(inPeriod, (id) => exercises.get(id)?.muscle)
  const topSets = muscles[0]?.sets ?? 1
  const weekly = weeklyVolumes(workouts, range.to, 8, counts).map((w) => ({ semana: formatShort(w.weekStart), volumen: Math.round(w.volume) }))

  return (
    <div>
      <Segmented
        label="Periodo"
        value={period}
        onChange={(p) => {
          setPeriod(p)
          setOffset(0)
        }}
        options={[{ value: 'week', label: 'Semana' }, { value: 'month', label: 'Mes' }]}
      />
      <div className="mt-3 flex items-center gap-2">
        <button type="button" className={`${btn} w-11 px-0`} aria-label="Periodo anterior" onClick={() => setOffset(offset - 1)}>‹</button>
        <h2 className="flex-1 text-center">{range.label}</h2>
        <button type="button" className={`${btn} w-11 px-0`} aria-label="Periodo siguiente" disabled={offset >= 0} onClick={() => setOffset(offset + 1)}>›</button>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-2">
        {[
          ['Entrenos', String(sum.workouts)],
          ['Volumen', `${fmtN(sum.volume)} kg`],
          ['Tiempo', sum.durationSec ? fmtT(sum.durationSec) : '0:00'],
          ['Series', String(sum.sets)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl border border-line bg-card p-3">
            <dt className="text-xs text-mut">{k}</dt>
            <dd className="whitespace-nowrap font-num text-2xl font-extrabold">{v}</dd>
          </div>
        ))}
      </dl>

      {loaded && workouts.length === 0 && <div className={`${card} text-center text-mut`}>Tus resúmenes aparecerán después de tu primer entreno.</div>}

      {workouts.length > 0 && (
        <section className={card} aria-label="Volumen semanal">
          <h3>Volumen por semana</h3>
          <BarSeries data={weekly} xKey="semana" yKey="volumen" name="Volumen" unit="kg" label="Volumen de las últimas 8 semanas" />
        </section>
      )}

      {muscles.length > 0 && (
        <section className={card} aria-label="Músculos trabajados">
          <h3>Músculos trabajados</h3>
          <p className="text-xs text-mut">Series de trabajo en el periodo</p>
          <ul className="mt-2 grid gap-2">
            {muscles.map((m) => (
              <li key={m.muscle} className="grid grid-cols-[96px_1fr_28px] items-center gap-2 text-sm">
                <span className="truncate">{m.muscle}</span>
                <span className="h-2.5 overflow-hidden rounded-full bg-soft" aria-hidden="true">
                  <span className="block h-full rounded-full bg-cy" style={{ width: `${(m.sets / topSets) * 100}%` }} />
                </span>
                <b className="text-right font-num">{m.sets}</b>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
