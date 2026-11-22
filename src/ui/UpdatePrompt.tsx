import { useRegisterSW } from 'virtual:pwa-register/react'

/** Aviso cuando hay una versión nueva del service worker esperando. */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div
      role="status"
      className="fixed inset-x-4 z-30 mx-auto flex max-w-[608px] items-center gap-2 rounded-xl bg-ink py-2 pr-2 pl-4 text-sm font-semibold text-bg top-[calc(env(safe-area-inset-top)+8px)]"
    >
      <span className="flex-1">Nueva versión disponible</span>
      <button
        type="button"
        className="min-h-11 rounded-xl px-3"
        onClick={() => setNeedRefresh(false)}
      >
        Luego
      </button>
      <button
        type="button"
        className="min-h-11 rounded-xl bg-acc px-4 text-accink"
        onClick={() => void updateServiceWorker(true)}
      >
        Actualizar
      </button>
    </div>
  )
}
