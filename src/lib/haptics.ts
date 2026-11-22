// Vibración corta al marcar series y similares. iOS Safari no soporta navigator.vibrate: ahí no pasa nada.

export type Haptic = 'tap' | 'success' | 'warn'

const PATTERNS: Record<Haptic, number | number[]> = { tap: 12, success: [20, 40, 30], warn: [60, 40, 60] }

let enabled = true

export const setHapticsEnabled = (v: boolean): void => {
  enabled = v
}

export const hapticsSupported = (): boolean => typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function'

export function haptic(kind: Haptic = 'tap'): void {
  if (!enabled || !hapticsSupported()) return
  try {
    navigator.vibrate(PATTERNS[kind])
  } catch {
    /* sin vibración */
  }
}
