import { useEffect } from 'react'
import { Link, useLocation } from 'react-router'
import { beep } from '../features/workout/sound'
import { useWorkout } from '../features/workout/store'
import { fmtT } from '../lib/time'
import { useNow } from '../ui/useNow'

const strip =
  'fixed inset-x-0 z-30 bottom-[calc(var(--tabbar-h)+1px+env(safe-area-inset-bottom))]'
const inner = 'relative mx-auto flex max-w-[640px] items-center gap-2 overflow-hidden border-t-2 border-acc bg-card px-3 py-2 text-ink'
const mini = 'ui-btn ui-soft cut-sm relative min-h-11 px-3'

/**
 * Franja sobre la tab bar: el descanso en curso (en cualquier pestaña) o, si no hay descanso,
 * un acceso al entreno en curso. Todo se calcula con la hora de fin guardada, no con ticks.
 */
export function LiveStrip() {
  const active = useWorkout((s) => s.active)
  const { pathname } = useLocation()
  const endsAt = active?.restEndsAt ?? null
  const total = active?.restTotalSec ?? 0
  const now = useNow(active ? (endsAt != null ? 250 : 1000) : null)

  // Si terminó mientras la app estaba abierta suena; si terminó estando en segundo plano, se cierra en silencio.
  useEffect(() => {
    if (endsAt == null || now < endsAt) return
    if (now - endsAt < 4000) beep()
    useWorkout.getState().endRest()
  }, [now, endsAt])

  if (!active) return null

  if (endsAt != null && now < endsAt) {
    const left = (endsAt - now) / 1000
    const pct = total > 0 ? Math.min(100, Math.max(0, 100 - (left / total) * 100)) : 0
    const st = useWorkout.getState
    return (
      <div className={strip} role="timer" aria-label="Descanso">
        <div className={inner}>
          <div className="absolute inset-y-0 left-0 bg-acc opacity-20" style={{ width: `${pct}%` }} aria-hidden="true" />
          <span className="relative font-num text-xs font-semibold tracking-[0.12em] text-mut uppercase">Descanso</span>
          <b className="relative font-num text-3xl leading-none text-accfg" aria-live="off">{fmtT(Math.ceil(left))}</b>
          <span className="flex-1" />
          <button type="button" className={mini} onClick={() => st().adjustRest(-15)}>−15</button>
          <button type="button" className={mini} onClick={() => st().adjustRest(15)}>+15</button>
          <button type="button" className={mini} onClick={() => st().endRest()}>Saltar</button>
        </div>
      </div>
    )
  }

  if (pathname !== '/entreno') {
    return (
      <div className={strip}>
        <Link to="/entreno" className={`${inner} min-h-11 font-num font-bold tracking-[0.08em] uppercase`}>
          <span>Entreno en curso</span>
          <b className="font-num text-accfg">{fmtT((now - active.startedAt) / 1000)}</b>
          <span className="flex-1" />
          <span aria-hidden="true" className="text-accfg">›</span>
        </Link>
      </div>
    )
  }
  return null
}
