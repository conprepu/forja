import { useMemo, useState } from 'react'
import type { Workout } from '../../db/schema'
import { addMonths, formatDay, localDate, monthGrid, monthKey, monthLabel, todayStr } from '../../lib/dates'
import { workoutsByDay } from '../../lib/progress'
import { fmtN, fmtT } from '../../lib/time'
import { workoutVolume } from '../../lib/workout'
import { btn, card } from '../../ui/cls'
import { countsVolume, useExerciseMap } from '../workout/hooks'
import { useWorkout } from '../workout/store'
import { WorkoutDetail } from '../workout/WorkoutDetail'
import { useWorkouts } from './hooks'

const DOW = ['L', 'M', 'M', 'J', 'V', 'S', 'D']

export function HistoryTab() {
  const { workouts, loaded } = useWorkouts()
  const exercises = useExerciseMap()
  const active = useWorkout((s) => s.active)
  const [month, setMonth] = useState(() => monthKey(todayStr()))
  const [day, setDay] = useState<string | null>(null)
  const [detail, setDetail] = useState<Workout | null>(null)

  const byDay = useMemo(() => workoutsByDay(workouts), [workouts])
  const inMonth = useMemo(() => workouts.filter((w) => localDate(w.startedAt).startsWith(month)).reverse(), [workouts, month])
  const list = day ? (byDay.get(day) ?? []) : inMonth
  const today = todayStr()

  const row = (w: Workout) => {
    const sets = w.items.reduce((n, i) => n + i.sets.length, 0)
    const vol = workoutVolume(w.items.map((i) => ({ exerciseId: i.exerciseId, sets: i.sets })), (id) => countsVolume(exercises.get(id)))
    return (
      <button key={w.id} type="button" onClick={() => setDetail(w)} className={`${card} block w-full text-left`}>
        <div className="flex items-baseline gap-2">
          <h3 className="min-w-0 flex-1 truncate">{w.name}</h3>
          <span className="text-xs text-mut">{formatDay(localDate(w.startedAt))}</span>
        </div>
        <p className="mt-1 flex flex-wrap gap-x-3.5 text-sm text-mut">
          <span>{fmtT((w.endedAt - w.startedAt) / 1000)}</span>
          <span>{fmtN(vol)} kg</span>
          <span>{sets} series</span>
        </p>
      </button>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <button type="button" className={`${btn} w-11 px-0`} aria-label="Mes anterior" onClick={() => { setMonth(addMonths(month, -1)); setDay(null) }}>‹</button>
        <h2 className="flex-1 text-center">{monthLabel(month)}</h2>
        <button type="button" className={`${btn} w-11 px-0`} aria-label="Mes siguiente" disabled={month >= monthKey(today)} onClick={() => { setMonth(addMonths(month, 1)); setDay(null) }}>›</button>
      </div>

      <div className="mt-3 rounded-[18px] border border-line bg-card p-2" role="grid" aria-label={`Calendario de ${monthLabel(month)}`}>
        <div className="grid grid-cols-7 text-center text-xs font-semibold text-mut" aria-hidden="true">
          {DOW.map((d, i) => <span key={i} className="py-1">{d}</span>)}
        </div>
        {monthGrid(month).map((week, wi) => (
          <div key={wi} className="grid grid-cols-7" role="row">
            {week.map((d, di) => {
              if (!d) return <span key={di} />
              const n = byDay.get(d)?.length ?? 0
              const selected = day === d
              return (
                <button
                  key={d}
                  type="button"
                  role="gridcell"
                  aria-label={`${formatDay(d)}${n ? `, ${n} ${n === 1 ? 'entreno' : 'entrenos'}` : ''}`}
                  aria-pressed={selected}
                  onClick={() => setDay(selected ? null : d)}
                  className={`relative mx-auto grid h-11 w-11 place-items-center rounded-full text-sm ${selected ? 'bg-acc font-bold text-accink' : d === today ? 'font-bold text-acc' : ''}`}
                >
                  {Number(d.slice(8))}
                  {n > 0 && <span aria-hidden="true" className={`absolute bottom-1 h-1.5 w-1.5 rounded-full ${selected ? 'bg-accink' : 'bg-ok'}`} />}
                </button>
              )
            })}
          </div>
        ))}
      </div>

      <h3 className="mt-4 text-mut">
        {day ? formatDay(day) : `${inMonth.length} ${inMonth.length === 1 ? 'entreno' : 'entrenos'} este mes`}
      </h3>
      {loaded && list.length === 0 && <div className={`${card} text-center text-mut`}>{day ? 'Sin entrenos ese día.' : 'Sin entrenos este mes.'}</div>}
      {list.map(row)}

      <WorkoutDetail workout={detail} canStart={!active} onClose={() => setDetail(null)} />
    </div>
  )
}
