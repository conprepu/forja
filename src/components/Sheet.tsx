import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import s from './Sheet.module.css'

type Props = {
  title: string
  onCancel: () => void
  /** Botón principal a la derecha ("Guardar", "Añadir"). */
  confirm?: { label: string; onClick: () => void; disabled?: boolean }
  children: ReactNode
}

/** Hoja modal inferior estilo iOS (pageSheet). */
export function Sheet({ title, onCancel, confirm, children }: Props) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [onCancel])

  return createPortal(
    <div className={s.root}>
      <div className={s.backdrop} onClick={onCancel} />
      <div className={s.sheet} role="dialog" aria-modal="true" aria-label={title}>
        <header className={s.header}>
          <button type="button" className={s.btn} onClick={onCancel}>Cancelar</button>
          <h2 className={s.title}>{title}</h2>
          {confirm ? (
            <button type="button" className={`${s.btn} ${s.confirm}`} onClick={confirm.onClick} disabled={confirm.disabled}>
              {confirm.label}
            </button>
          ) : <span />}
        </header>
        <div className={s.body}>{children}</div>
      </div>
    </div>,
    document.body,
  )
}
