/** Lee un número escrito a mano ("82,5" o "82.5"). Vacío o inválido = null. */
export function parseDecimal(text: string): number | null {
  const t = text.trim().replace(',', '.')
  if (t === '') return null
  const n = Number(t)
  return Number.isFinite(n) && n >= 0 ? n : null
}

export const r1 = (x: number): number => Math.round(x * 10) / 10

// ---------- kg / lb ----------
// Todo se guarda en kg (récords, 1RM y volumen siguen iguales). Las libras son solo cómo se escribe y se ve
// el peso de los ejercicios que marcaste en lb (máquinas con placas en libras).

export type WeightUnit = 'kg' | 'lb'
export const KG_PER_LB = 0.45359237

const r2 = (x: number): number => Math.round(x * 100) / 100

/** kg guardados → número que se muestra en esa unidad (lb a 2 decimales, así "135" vuelve como 135). */
export const fromKg = (kg: number, unit: WeightUnit): number => (unit === 'lb' ? r2(kg / KG_PER_LB) : kg)

/** Número escrito en esa unidad → kg que se guardan, sin redondear para no perder libras al volver a mostrarlas. */
export const toKg = (value: number, unit: WeightUnit): number => (unit === 'lb' ? value * KG_PER_LB : value)

/** "61.2 kg" o "135 lb". */
export const fmtWeight = (kg: number, unit: WeightUnit): string => `${unit === 'lb' ? fromKg(kg, 'lb') : r1(kg)} ${unit}`
