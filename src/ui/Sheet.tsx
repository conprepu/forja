import { useEffect, useRef, type ReactNode } from 'react'
import { btnGhost } from './cls'

interface Props {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}

/** Hoja inferior modal: se cierra con el fondo, con "Cerrar" o con Escape. */
export function Sheet({ open, onClose, title, children }: Props) {
  const panel = useRef<HTMLDivElement>(null)
  // onClose suele ser una función nueva en cada render del padre. Si el efecto dependiera de ella,
  // se volvería a ejecutar en cada tecla y robaría el foco del campo (el teclado se cerraba).
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panel.current?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 flex flex-col justify-end">
      <button type="button" aria-label="Cerrar" tabIndex={-1} className="absolute inset-0 bg-black/45" onClick={onClose} />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="relative mx-auto max-h-[92vh] w-full max-w-[640px] animate-sheet-up overflow-y-auto rounded-t-[22px] bg-bg px-4 pt-2 pb-[calc(20px+env(safe-area-inset-bottom))] outline-none motion-reduce:animate-none"
      >
        <div className="mx-auto mb-2 h-[5px] w-10 rounded-full bg-line" />
        <div className="mb-2 flex items-center gap-2">
          <h2 className="flex-1">{title}</h2>
          <button type="button" className={btnGhost} onClick={onClose}>
            Cerrar
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
