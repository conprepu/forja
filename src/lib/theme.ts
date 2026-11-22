export type Theme = 'auto' | 'light' | 'dark'

export const THEMES: readonly { value: Theme; label: string }[] = [
  { value: 'auto', label: 'Automático' },
  { value: 'light', label: 'Claro' },
  { value: 'dark', label: 'Oscuro' },
]

export const parseTheme = (v: unknown): Theme => (v === 'light' || v === 'dark' ? v : 'auto')

// Mismos colores de fondo que los tokens de index.css (para la barra de estado del teléfono).
const BG = { light: '#f4f4f1', dark: '#0f1112' } as const

/** Color de la barra de estado: el del tema elegido, o el del sistema en automático. */
export const themeColor = (theme: Theme, systemDark: boolean): string => BG[theme === 'auto' ? (systemDark ? 'dark' : 'light') : theme]

/** Aplica el tema al documento: atributo `data-theme` y `<meta name="theme-color">`. */
export function applyTheme(theme: Theme, doc: Document | undefined = typeof document === 'undefined' ? undefined : document): void {
  if (!doc) return
  const root = doc.documentElement
  if (theme === 'auto') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', theme)

  doc.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.remove())
  const add = (content: string, media?: string) => {
    const meta = doc.createElement('meta')
    meta.name = 'theme-color'
    meta.content = content
    if (media) meta.media = media
    doc.head.appendChild(meta)
  }
  // Automático: dos <meta> con media, así sigue al sistema solo. Claro/oscuro: uno fijo.
  if (theme === 'auto') {
    add(themeColor('light', false), '(prefers-color-scheme: light)')
    add(themeColor('dark', true), '(prefers-color-scheme: dark)')
  } else add(themeColor(theme, false))
}
