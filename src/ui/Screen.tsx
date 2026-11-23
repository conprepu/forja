import type { ReactNode } from 'react'

/** Encabezado fijo con safe area superior + contenido de la pantalla. */
export function Screen({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <>
      <header className="sticky top-0 z-10 bg-bg pt-[calc(14px+env(safe-area-inset-top))] pb-2.5">
        <div className="flex items-center gap-3">
          <h1 className="animate-glitch-in">{title}</h1>
          <span aria-hidden="true" className="ml-auto flex items-center gap-1">
            <i className="h-3 w-1.5 -skew-x-[22deg] bg-line" />
            <i className="h-3 w-1.5 -skew-x-[22deg] bg-cy" />
            <i className="h-3 w-3 -skew-x-[22deg] bg-acc" />
          </span>
        </div>
        <div className="hud-rule mt-2" aria-hidden="true" />
      </header>
      {children}
    </>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="hud my-3 px-2.5 py-6 text-center text-mut">{children}</div>
}
