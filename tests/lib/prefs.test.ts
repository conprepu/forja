import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ForjaDB } from '../../src/db/db'
import { applyPrefs, getHaptics, getTheme, saveHaptics, saveTheme } from '../../src/db/prefs'
import { haptic, setHapticsEnabled } from '../../src/lib/haptics'
import { applyTheme, parseTheme, themeColor } from '../../src/lib/theme'

type Meta = { content?: string; media?: string; remove?: () => void }

describe('theme', () => {
  it('parseTheme acepta solo los valores válidos', () => {
    expect(['light', 'dark', 'auto', 'x', undefined, 3].map(parseTheme)).toEqual(['light', 'dark', 'auto', 'auto', 'auto', 'auto'])
  })
  it('themeColor sigue al tema o al sistema', () => {
    expect(themeColor('dark', false)).toBe('#05060f')
    expect(themeColor('light', true)).toBe('#e8ebf5')
    expect(themeColor('auto', true)).toBe('#05060f')
  })
  it('applyTheme pone y quita data-theme y deja los meta correctos', () => {
    const attrs = new Map<string, string>()
    let metas: Meta[] = []
    const doc = {
      documentElement: { setAttribute: (k: string, v: string) => attrs.set(k, v), removeAttribute: (k: string) => attrs.delete(k) },
      head: { appendChild: (m: Meta) => metas.push(m) },
      createElement: () => ({ remove() {} }),
      querySelectorAll: () => ({ forEach: (f: (m: Meta) => void) => metas.splice(0).forEach(f) }),
    } as unknown as Document
    applyTheme('dark', doc)
    expect(attrs.get('data-theme')).toBe('dark')
    expect(metas.map((m) => m.content)).toEqual(['#05060f'])
    applyTheme('auto', doc)
    expect(attrs.has('data-theme')).toBe(false)
    expect(metas).toHaveLength(2)
    expect(metas.map((m) => m.media)).toEqual(['(prefers-color-scheme: light)', '(prefers-color-scheme: dark)'])
    metas = []
  })
})

describe('preferencias guardadas', () => {
  it('tema y vibración se guardan y se leen', async () => {
    const db = new ForjaDB(`prefs-${Math.random()}`)
    expect(await getTheme(db)).toBe('auto')
    expect(await getHaptics(db)).toBe(true)
    await saveTheme(db, 'light')
    await saveHaptics(db, false)
    expect(await getTheme(db)).toBe('light')
    expect(await getHaptics(db)).toBe(false)
    await expect(applyPrefs(db)).resolves.toBeUndefined() // sin documento (node) no hace nada
  })
})

describe('haptic', () => {
  beforeEach(() => setHapticsEnabled(true))
  afterEach(() => {
    vi.unstubAllGlobals()
    setHapticsEnabled(true)
  })
  it('vibra si está activado y soportado', () => {
    const vibrate = vi.fn()
    vi.stubGlobal('navigator', { vibrate })
    haptic('tap')
    expect(vibrate).toHaveBeenCalledTimes(1)
  })
  it('no hace nada si está apagado', () => {
    const vibrate = vi.fn()
    vi.stubGlobal('navigator', { vibrate })
    setHapticsEnabled(false)
    haptic('success')
    expect(vibrate).not.toHaveBeenCalled()
  })
  it('no truena en iOS (sin vibrate)', () => {
    vi.stubGlobal('navigator', {})
    expect(() => haptic('warn')).not.toThrow()
  })
})
