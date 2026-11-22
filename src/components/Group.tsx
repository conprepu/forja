import type { ReactNode } from 'react'
import { IconChevronRight } from './icons'
import s from './Group.module.css'

/** Sección "inset grouped" de iOS con encabezado y pie opcionales. */
export function Group({ header, footer, children }: { header?: ReactNode; footer?: ReactNode; children: ReactNode }) {
  return (
    <section className={s.group}>
      {header && <h2 className={s.header}>{header}</h2>}
      <div className={s.card}>{children}</div>
      {footer && <p className={s.footer}>{footer}</p>}
    </section>
  )
}

type RowProps = {
  children: ReactNode
  /** Elemento a la izquierda (icono, punto de color). */
  leading?: ReactNode
  /** Texto o elemento a la derecha. */
  detail?: ReactNode
  chevron?: boolean
  onClick?: () => void
  tone?: 'default' | 'tint' | 'destructive'
}

export function Row({ children, leading, detail, chevron, onClick, tone = 'default' }: RowProps) {
  const content = (
    <>
      {leading && <span className={s.leading}>{leading}</span>}
      <span className={s.label} data-tone={tone}>{children}</span>
      {detail !== undefined && <span className={s.detail}>{detail}</span>}
      {chevron && <IconChevronRight className={s.chevron} />}
    </>
  )
  return onClick ? (
    <button type="button" className={s.row} onClick={onClick}>{content}</button>
  ) : (
    <div className={s.row}>{content}</div>
  )
}

export function ColorDot({ color, size = 12 }: { color: string; size?: number }) {
  return <span className={s.dot} style={{ background: `var(--${color})`, width: size, height: size }} />
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className={s.empty}>
      <p className={s.emptyTitle}>{title}</p>
      {hint && <p className={s.emptyHint}>{hint}</p>}
    </div>
  )
}
