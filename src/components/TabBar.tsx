import { navigate } from '../lib/router'
import { IconHabits, IconLists, IconSettings, IconToday } from './icons'
import s from './TabBar.module.css'

const tabs = [
  { key: 'today', label: 'Hoy', Icon: IconToday },
  { key: 'lists', label: 'Listas', Icon: IconLists },
  { key: 'habits', label: 'Hábitos', Icon: IconHabits },
  { key: 'settings', label: 'Ajustes', Icon: IconSettings },
] as const

export function TabBar({ active }: { active: string }) {
  return (
    <nav className={s.bar} aria-label="Secciones">
      {tabs.map(({ key, label, Icon }) => (
        <button
          key={key}
          className={s.tab}
          data-active={active === key}
          aria-current={active === key ? 'page' : undefined}
          onClick={() => navigate(`/${key}`)}
        >
          <Icon width={26} height={26} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}
