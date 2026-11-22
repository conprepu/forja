import { useEffect, useState } from 'react'

/**
 * Hora actual que se refresca cada `intervalMs` (null = no refrescar). Solo sirve para repintar:
 * todo cálculo de tiempo sale de timestamps, así que perder ticks en segundo plano no importa.
 */
export function useNow(intervalMs: number | null): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (intervalMs == null) return
    const tick = () => setNow(Date.now())
    tick()
    const t = setInterval(tick, intervalMs)
    document.addEventListener('visibilitychange', tick)
    return () => {
      clearInterval(t)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [intervalMs])
  return now
}
