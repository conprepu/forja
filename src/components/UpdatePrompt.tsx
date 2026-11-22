import { useRegisterSW } from 'virtual:pwa-register/react'
import s from './UpdatePrompt.module.css'

/** Aviso cuando hay una versión nueva del service worker esperando. */
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      // Buscar actualizaciones cada hora mientras la app está abierta.
      if (reg) setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000)
    },
  })

  if (!needRefresh) return null
  return (
    <div className={s.toast} role="status">
      <span>Nueva versión disponible</span>
      <button type="button" className={s.later} onClick={() => setNeedRefresh(false)}>Luego</button>
      <button type="button" className={s.update} onClick={() => updateServiceWorker(true)}>Actualizar</button>
    </div>
  )
}
