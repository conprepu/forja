import type { ReactNode } from 'react'

/** Encabezado fijo con safe area superior + contenido de la pantalla. */
export function Screen({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-10 bg-bg pt-[calc(14px+env(safe-area-inset-top))] pb-2.5">
        <h1>{title}</h1>
      </header>
      {children}
    </>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="my-3 rounded-[18px] border border-line bg-card px-2.5 py-6 text-center text-mut">
      {children}
    </div>
  )
}
