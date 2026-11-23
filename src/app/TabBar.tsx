import { NavLink } from 'react-router'
import { TABS } from './tabs'

export function TabBar() {
  return (
    <nav
      aria-label="Secciones"
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-card pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="mx-auto grid max-w-[640px] grid-cols-5 pr-[env(safe-area-inset-right)] pl-[env(safe-area-inset-left)]">
        {TABS.map(({ path, label, Icon }) => (
          <li key={path}>
            <NavLink
              to={path}
              className={({ isActive }) =>
                `relative flex min-h-[var(--tabbar-h)] flex-col items-center justify-center gap-0.5 font-num text-[12px] font-bold tracking-[0.1em] uppercase ${
                  isActive
                    ? 'text-accfg after:absolute after:inset-x-3 after:top-0 after:h-0.5 after:bg-acc after:shadow-[0_0_8px_var(--glow)] after:content-[""]'
                    : 'text-mut'
                }`
              }
            >
              <Icon />
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
