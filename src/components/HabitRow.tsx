import { toggleHabit } from '../db/repo'
import type { Habit } from '../db/types'
import { computeStreak, countInWeek, describeSchedule, formatStreak } from '../lib/habits'
import { IconCheck, IconChevronRight, IconFlame } from './icons'
import s from './HabitRow.module.css'

type Props = { habit: Habit; done: ReadonlySet<string>; today: string; onOpen: () => void }

export function HabitRow({ habit, done, today, onOpen }: Props) {
  const isDone = done.has(today)
  const streak = computeStreak(habit.schedule, done, today)
  const sched = habit.schedule
  const progress = sched.kind === 'weekly' ? `${countInWeek(done, today)}/${sched.times} esta semana` : describeSchedule(sched)

  return (
    <div className={s.row}>
      <HabitCheck color={habit.color} done={isDone} label={habit.name} onToggle={() => toggleHabit(habit.id, today)} />
      <button type="button" className={s.content} onClick={onOpen}>
        <span className={s.text}>
          <span className={s.name}>{habit.name}</span>
          <span className={s.meta}>{progress}</span>
        </span>
        {streak.current > 0 && (
          <span className={s.streak} aria-label={`Racha de ${formatStreak(streak, streak.current)}`}>
            <IconFlame width={15} height={15} /> {streak.current}
          </span>
        )}
        <IconChevronRight className={s.chevron} />
      </button>
    </div>
  )
}

export function HabitCheck({ color, done, label, onToggle, size = 30 }: { color: string; done: boolean; label: string; onToggle: () => void; size?: number }) {
  return (
    <button
      type="button"
      className={s.check}
      data-done={done}
      style={{ ['--c' as string]: `var(--${color})`, ['--size' as string]: `${size}px` }}
      aria-pressed={done}
      aria-label={done ? `Desmarcar ${label}` : `Marcar ${label}`}
      onClick={onToggle}
    >
      {done && <IconCheck width={size * 0.55} height={size * 0.55} />}
    </button>
  )
}
