// Piezas de texto compartidas por el intérprete de comidas (describe.ts) y los platillos armables (dishes.ts).
import { norm } from './text'

/** Singular aproximado: frijoles→frijol, tortillas→tortilla, limones→limon. */
export function stem(w: string): string {
  if (w.length > 4 && w.endsWith('ones')) return w.slice(0, -2)
  if (w.length >= 5 && /[lrnd]es$/.test(w)) return w.slice(0, -2)
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1)
  return w
}

/** Palabras de relleno que no dicen qué se comió. */
export const STOP = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'unos', 'unas', 'mi', 'mis', 'al', 'en', 'a', 'para', 'tipo', 'como', 'poco', 'algo', 'o', 'me', 'comi', 'desayune', 'cene', 'almorce', 'tome', 'bebi', 'hoy', 'ni'])

/** Adjetivos que describen cómo estaba, pero no cambian qué alimento es (ya en singular). */
export const NOISE = new Set(['ahumado', 'ahumada', 'casero', 'casera', 'tradicional', 'normal', 'sabroso', 'sabrosa', 'rico', 'rica', 'caliente', 'bien', 'muy', 'bastante', 'jugoso', 'jugosa', 'sencillo', 'sencilla', 'clasico', 'clasica', 'regular', 'estilo', 'especial', 'tipico', 'tipica'])

export const tokensOf = (s: string): string[] => norm(s).replace(/[^a-z0-9%./ ]/g, ' ').split(/\s+/).filter(Boolean).map(stem)

/** Igual que tokensOf pero sin las palabras de relleno ("crema de cacahuate" → crema, cacahuate). */
export const contentTokens = (s: string): string[] => tokensOf(s).filter((t) => !STOP.has(t))

/** ¿Difieren en una sola letra (cambiada, quitada o agregada)? */
function oneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false
  let i = 0
  while (i < a.length && i < b.length && a[i] === b[i]) i++
  if (a.length === b.length) return a.slice(i + 1) === b.slice(i + 1)
  return a.length > b.length ? a.slice(i + 1) === b.slice(i) : a.slice(i) === b.slice(i + 1)
}

/**
 * ¿Son la misma palabra? Igual, una variante de una letra de más ("yogur"/"yogurt") o, en palabras largas,
 * una errata de una letra ("hamburgesa"/"hamburguesa").
 */
export function sameToken(a: string, b: string): boolean {
  if (a === b) return true
  const [s, l] = a.length <= b.length ? [a, b] : [b, a]
  if (s.length >= 4 && l.length - s.length === 1 && l.startsWith(s)) return true
  return s.length >= 7 && oneEdit(a, b)
}
