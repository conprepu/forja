import { Group } from '../components/Group'
import { HabitRow } from '../components/HabitRow'
import { isDueToday } from '../lib/habits'
import { navigate } from '../lib/router'
import { EMPTY_SET, useHabits } from '../lib/useHabits'

/** Sección "Hábitos" de la vista Hoy: los que tocan hoy (o faltan para cumplir la semana). */
export function TodayHabits({ today }: { today: string }) {
  const data = useHabits()
  const due = data?.habits.filter((h) => isDueToday(h.schedule, data.logs.get(h.id) ?? EMPTY_SET, today)) ?? []
  if (!data || due.length === 0) return null
  return (
    <Group header="Hábitos">
      {due.map((habit) => (
        <HabitRow key={habit.id} habit={habit} done={data.logs.get(habit.id) ?? EMPTY_SET} today={today} onOpen={() => navigate(`/habits/${habit.id}`)} />
      ))}
    </Group>
  )
}
