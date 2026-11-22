import { useState } from 'react'
import { EmptyState, Group } from '../components/Group'
import { HabitEditor } from '../components/HabitEditor'
import { HabitRow } from '../components/HabitRow'
import { IconPlus } from '../components/icons'
import { Screen } from '../components/Screen'
import { toggleHabit } from '../db/repo'
import type { Habit } from '../db/types'
import { addDays, parseISODate, startOfWeek, WEEK_ORDER, WEEKDAY_SHORT } from '../lib/dates'
import { computeStreak, countInWeek, describeSchedule, formatStreak, isScheduled } from '../lib/habits'
import { navigate, useRoute } from '../lib/router'
import { EMPTY_SET, useHabits } from '../lib/useHabits'
import { useToday } from '../lib/useToday'
import s from './screens.module.css'
import h from './HabitsScreen.module.css'

export function HabitsScreen() {
  const { segments } = useRoute()
  return segments[1] ? <HabitDetail id={segments[1]} /> : <HabitsIndex />
}

function HabitsIndex() {
  const today = useToday()
  const data = useHabits()
  const [creating, setCreating] = useState(false)

  return (
    <Screen
      title="Hábitos"
      action={<button className={s.iconBtn} onClick={() => setCreating(true)} aria-label="Nuevo hábito"><IconPlus /></button>}
    >
      {data && data.habits.length === 0 && <EmptyState title="Sin hábitos todavía" hint="Toca + para crear el primero." />}
      {data && data.habits.length > 0 && (
        <Group>
          {data.habits.map((habit) => (
            <HabitRow key={habit.id} habit={habit} done={data.logs.get(habit.id) ?? EMPTY_SET} today={today} onOpen={() => navigate(`/habits/${habit.id}`)} />
          ))}
        </Group>
      )}
      {creating && <HabitEditor onClose={() => setCreating(false)} />}
    </Screen>
  )
}

const WEEKS = 5
const fmtMonth = new Intl.DateTimeFormat('es', { month: 'short' })

function HabitDetail({ id }: { id: string }) {
  const today = useToday()
  const data = useHabits()
  const [editing, setEditing] = useState(false)
  const back = { label: 'Hábitos', onClick: () => navigate('/habits') }
  const habit = data?.habits.find((x) => x.id === id)

  if (!data) return <Screen title="" back={back}>{null}</Screen>
  if (!habit) return <Screen title="Hábito" back={back}><EmptyState title="Hábito no encontrado" /></Screen>

  const done = data.logs.get(id) ?? EMPTY_SET
  const streak = computeStreak(habit.schedule, done, today)
  const total = [...done].filter((d) => d <= today).length

  return (
    <Screen title={habit.name} back={back} action={<button className={s.textBtn} onClick={() => setEditing(true)}>Editar</button>}>
      <div className={s.spacer} />
      <div className={h.stats}>
        <Stat label="Racha actual" value={streak.current} unit={unitOf(streak, streak.current)} accent />
        <Stat label="Mejor racha" value={streak.best} unit={unitOf(streak, streak.best)} />
        <Stat label="Total" value={total} unit={total === 1 ? 'vez' : 'veces'} />
      </div>

      <Group
        header={describeSchedule(habit.schedule)}
        footer={habit.schedule.kind === 'weekly' ? `Esta semana: ${countInWeek(done, today)} de ${habit.schedule.times}.` : 'Toca un día para marcarlo o desmarcarlo.'}
      >
        <Calendar habit={habit} done={done} today={today} />
      </Group>

      {editing && <HabitEditor habit={habit} onClose={() => setEditing(false)} onDeleted={() => navigate('/habits')} />}
    </Screen>
  )
}

/** "días"/"semanas" sin el número, para mostrarlo pequeño junto al valor. */
const unitOf = (s: Parameters<typeof formatStreak>[0], n: number) => formatStreak(s, n).replace(/^\d+ /, '')

function Stat({ label, value, unit, accent }: { label: string; value: number; unit: string; accent?: boolean }) {
  return (
    <div className={h.stat}>
      <span className={h.statValue} data-accent={accent}>{value} <small>{unit}</small></span>
      <span className={h.statLabel}>{label}</span>
    </div>
  )
}

/** Últimas 5 semanas (lunes a domingo), con la semana actual al final. */
function Calendar({ habit, done, today }: { habit: Habit; done: ReadonlySet<string>; today: string }) {
  const start = addDays(startOfWeek(today), -7 * (WEEKS - 1))
  const days = Array.from({ length: WEEKS * 7 }, (_, i) => addDays(start, i))

  return (
    <div className={h.calendar} style={{ ['--c' as string]: `var(--${habit.color})` }}>
      {WEEK_ORDER.map((d) => <span key={d} className={h.weekday}>{WEEKDAY_SHORT[d]}</span>)}
      {days.map((date) => {
        const future = date > today
        const on = done.has(date)
        const dayNum = parseISODate(date).getDate()
        return (
          <button
            key={date}
            type="button"
            className={h.day}
            data-done={on}
            data-today={date === today}
            data-off={!isScheduled(habit.schedule, date)}
            disabled={future}
            aria-pressed={on}
            aria-label={date}
            onClick={() => toggleHabit(habit.id, date)}
          >
            {dayNum === 1 ? fmtMonth.format(parseISODate(date)).replace('.', '') : dayNum}
          </button>
        )
      })}
    </div>
  )
}
