import type { ReactNode } from 'react'
import { IconChevronLeft } from './icons'
import s from './Screen.module.css'

type Props = {
  title: string
  children: ReactNode
  /** Botón de la derecha en la barra (p. ej. "Editar" o "+"). */
  action?: ReactNode
  /** Si existe, muestra "< back" y usa título pequeño en vez de large title. */
  back?: { label: string; onClick: () => void }
}

/** Pantalla iOS: barra de navegación + large title + contenido con scroll. */
export function Screen({ title, children, action, back }: Props) {
  return (
    <div className={s.screen}>
      <header className={s.nav}>
        <div className={s.navSide}>
          {back && (
            <button className={s.back} onClick={back.onClick}>
              <IconChevronLeft width={22} height={22} /> {back.label}
            </button>
          )}
        </div>
        <div className={s.navTitle}>{back ? title : ''}</div>
        <div className={`${s.navSide} ${s.right}`}>{action}</div>
      </header>
      {!back && <h1 className={s.largeTitle}>{title}</h1>}
      <main className={s.content}>{children}</main>
    </div>
  )
}
