export const PLATES = [25, 20, 15, 10, 5, 2.5, 1.25] as const
export const BARS = [20, 15, 10] as const

export interface PlateResult {
  /** kg que se cargan en cada lado. */
  perSide: number
  /** Discos de cada lado, de adentro hacia afuera. */
  plates: number[]
  /** kg por lado que no se pueden cargar con los discos disponibles. */
  leftover: number
}

// Se calcula en centésimas de kg para no arrastrar errores de punto flotante (1.25 + 2.5…).
const cents = (kg: number) => Math.round(kg * 100)

export function platesPerSide(
  totalKg: number,
  barKg = 20,
  available: readonly number[] = PLATES,
): PlateResult {
  const perSide = Math.max(0, (cents(totalKg) - cents(barKg)) / 2)
  let rest = Math.round(perSide)
  const plates: number[] = []
  for (const p of [...available].sort((a, b) => b - a)) {
    const c = cents(p)
    while (rest >= c) {
      plates.push(p)
      rest -= c
    }
  }
  return { perSide: perSide / 100, plates, leftover: rest / 100 }
}

export interface WarmupSet {
  kg: number
  reps: number
}

const ROUND_KG = 2.5
const roundTo = (kg: number, step: number) => Math.round(kg / step) * step

/**
 * Escalera de calentamiento hacia un peso de trabajo: barra sola ×10 (si el peso es de 60 kg o más),
 * y luego 40 % ×8, 60 % ×5, 75 % ×3 y 90 % ×1, redondeados a 2.5 kg.
 * Se descartan los escalones que no superen a la barra ni al anterior, o que lleguen al peso de trabajo.
 */
export function warmupSets(workKg: number, barKg = 20): WarmupSet[] {
  if (workKg <= barKg) return []
  const steps: [number, number][] = [
    [0.4, 8],
    [0.6, 5],
    [0.75, 3],
    [0.9, 1],
  ]
  const out: WarmupSet[] = []
  if (workKg >= 60) out.push({ kg: barKg, reps: 10 })
  for (const [pct, reps] of steps) {
    const kg = roundTo(workKg * pct, ROUND_KG)
    const last = out[out.length - 1]
    if (kg > barKg && kg < workKg && (!last || kg > last.kg)) out.push({ kg, reps })
  }
  return out
}
