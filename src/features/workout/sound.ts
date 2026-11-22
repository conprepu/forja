let ctx: AudioContext | null = null

/** iOS solo permite audio tras un toque: se llama desde el botón ✓ para dejarlo listo. */
export function unlockAudio(): void {
  try {
    if (!ctx) {
      const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (C) ctx = new C()
    }
    if (ctx?.state === 'suspended') void ctx.resume()
  } catch {
    /* sin audio: el aviso visual basta */
  }
}

/** Dos pitidos al terminar el descanso. iOS no soporta vibrate(); en Android sí vibra. */
export function beep(): void {
  try {
    navigator.vibrate?.([200, 100, 200])
  } catch {
    /* ignorar */
  }
  try {
    if (!ctx || ctx.state !== 'running') return
    const c = ctx
    for (const offset of [0, 0.35]) {
      const osc = c.createOscillator()
      const gain = c.createGain()
      osc.frequency.value = 880
      osc.connect(gain)
      gain.connect(c.destination)
      const t = c.currentTime + offset
      gain.gain.setValueAtTime(0.25, t)
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25)
      osc.start(t)
      osc.stop(t + 0.25)
    }
  } catch {
    /* ignorar */
  }
}
