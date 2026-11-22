/** Lee un número escrito a mano ("82,5" o "82.5"). Vacío o inválido = null. */
export function parseDecimal(text: string): number | null {
  const t = text.trim().replace(',', '.')
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) && n >= 0 ? n : null
}

export const r1 = (x: number): number => Math.round(x * 10) / 10
