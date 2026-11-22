// Registrar comida describiéndola ("2 huevos con 3 tortillas y un vaso de leche").
// Todo se resuelve en el dispositivo contra tu base de alimentos: sin internet y sin enviar nada a ningún servicio.
import type { Food } from '../db/schema'
import { norm } from './text'

export type Basis = 'peso' | 'porcion' | 'estimado'

export interface DescribedItem {
  /** Fragmento original que se interpretó. */
  text: string
  /** Lo que quedó como nombre de alimento. */
  query: string
  qty: number | null
  unit: UnitKey | null
  /** null = no se encontró en la base. */
  food: Food | null
  grams: number
  /** De dónde salió la cantidad: peso dicho, porción del alimento o un cálculo aproximado. */
  basis: Basis
}

export type UnitKey = 'g' | 'kg' | 'ml' | 'l' | 'taza' | 'vaso' | 'cda' | 'cdita' | 'lata' | 'rebanada' | 'pieza' | 'scoop' | 'puno' | 'plato' | 'porcion' | 'par'

const NUM_WORDS: Record<string, number> = {
  un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10, medio: 0.5, media: 0.5,
}

const UNITS: [RegExp, UnitKey][] = [
  [/^(g|gr|grs|gramo|gramos)$/, 'g'],
  [/^(kg|kgs|kilo|kilos|kilogramo|kilogramos)$/, 'kg'],
  [/^(ml|mililitro|mililitros)$/, 'ml'],
  [/^(l|lt|lts|litro|litros)$/, 'l'],
  [/^(taza|tazas)$/, 'taza'],
  [/^(vaso|vasos)$/, 'vaso'],
  [/^(cda|cdas|cucharada|cucharadas)$/, 'cda'],
  [/^(cdita|cditas|cucharadita|cucharaditas)$/, 'cdita'],
  [/^(lata|latas)$/, 'lata'],
  [/^(rebanada|rebanadas)$/, 'rebanada'],
  [/^(pieza|piezas|pza|pzas)$/, 'pieza'],
  [/^(scoop|scoops|cucharon|cucharones)$/, 'scoop'],
  [/^(puno|punos)$/, 'puno'],
  [/^(plato|platos)$/, 'plato'],
  [/^(porcion|porciones)$/, 'porcion'],
  [/^par$/, 'par'],
]

const STOP = new Set(['de', 'del', 'la', 'el', 'los', 'las', 'unos', 'unas', 'mi', 'mis', 'al', 'en', 'a', 'para', 'tipo', 'como', 'poco', 'algo', 'o', 'me', 'comi', 'desayune', 'cene', 'almorce', 'tome', 'bebi', 'hoy'])

/** Cuando dicen solo "leche" o "pollo", cuál alimento de la base es el más probable. */
const PREFERRED: Record<string, string> = {
  leche: 'leche entera', pollo: 'pechuga de pollo cocida', arroz: 'arroz blanco cocido', frijol: 'frijoles negros cocidos',
  tortilla: 'tortilla de maiz', pan: 'pan integral', huevo: 'huevo entero', atun: 'atun en agua', yogur: 'yogur natural',
  yogurt: 'yogur natural', avena: 'avena en hojuelas', carne: 'bistec de res cocido', res: 'bistec de res cocido', cafe: 'cafe negro',
  jugo: 'jugo de naranja', refresco: 'refresco de cola', coca: 'refresco de cola', cola: 'refresco de cola', proteina: 'proteina whey',
  whey: 'proteina whey', aceite: 'aceite de oliva', queso: 'queso panela', pescado: 'tilapia cocida', cerdo: 'lomo de cerdo cocido',
  salmon: 'salmon cocido', camaron: 'camaron cocido', papa: 'papa cocida', pasta: 'pasta cocida', espagueti: 'pasta cocida',
  chocolate: 'chocolate amargo 70%', galleta: 'galletas marias', cacahuate: 'cacahuates', nuez: 'nueces', almendra: 'almendras',
  elote: 'elote cocido', camote: 'camote cocido', brocoli: 'brocoli cocido', nopal: 'nopales cocidos', pizza: 'pizza de pepperoni',
  hamburguesa: 'hamburguesa', taco: 'taco al pastor', quesadilla: 'quesadilla de queso', torta: 'torta de jamon', jamon: 'jamon de pavo',
}

/** Singular aproximado: frijoles→frijol, tortillas→tortilla, limones→limon. */
export function stem(w: string): string {
  if (w.length > 4 && w.endsWith('ones')) return w.slice(0, -2)
  if (w.length >= 5 && /[lrnd]es$/.test(w)) return w.slice(0, -2)
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1)
  return w
}

const tokensOf = (s: string): string[] => norm(s).replace(/[^a-z0-9%./ ]/g, ' ').split(/\s+/).filter(Boolean).map(stem)

const sameToken = (a: string, b: string) => a === b || (a.length >= 4 && b.startsWith(a)) || (b.length >= 4 && a.startsWith(b))

/** Parte la frase en alimentos: comas, "y", "con", "más", saltos de línea. */
export function splitDescription(text: string): string[] {
  const t = norm(text)
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/½/g, ' 0.5 ')
    .replace(/¼/g, ' 0.25 ')
    .replace(/¾/g, ' 0.75 ')
    .replace(/(\d)([a-z])/g, '$1 $2')
    .replace(/([a-z])(\d)/g, '$1 $2')
  return t
    .split(/[,;\n+&]|\s(?:y|e|con|mas)\s/)
    .map((s) => s.trim())
    .filter(Boolean)
}

interface Parsed {
  qty: number | null
  unit: UnitKey | null
  query: string[]
}

const unitOf = (tok: string | undefined): UnitKey | null => (tok ? (UNITS.find(([re]) => re.test(tok))?.[1] ?? null) : null)

function numberOf(tok: string): number | null {
  if (/^\d+(\.\d+)?$/.test(tok)) return Number(tok)
  const f = tok.match(/^(\d+)\/(\d+)$/)
  if (f && Number(f[2]) > 0) return Number(f[1]) / Number(f[2])
  return NUM_WORDS[tok] ?? null
}

/** Saca cantidad y unidad de un fragmento: "150 g de pollo", "media taza de arroz", "pollo 200 g", "2 huevos". */
export function parseChunk(chunk: string): Parsed {
  const toks = chunk.split(/\s+/).filter(Boolean)
  let qty: number | null = null
  let unit: UnitKey | null = null
  const used = new Set<number>()
  for (let i = 0; i < toks.length; i++) {
    const n = numberOf(toks[i]!)
    if (n == null) continue
    qty = n
    used.add(i)
    const u = unitOf(toks[i + 1])
    if (u) {
      unit = u
      used.add(i + 1)
    }
    break
  }
  if (unit === 'par') {
    qty = (qty ?? 1) * 2
    unit = null
  }
  // sin cantidad numérica: "un par de huevos", "una lata de atún" ya quedaron cubiertos; "lata de atún" → 1 lata
  if (qty == null) {
    const k = toks.findIndex((t) => unitOf(t) && unitOf(t) !== 'g' && unitOf(t) !== 'kg' && unitOf(t) !== 'ml' && unitOf(t) !== 'l')
    if (k >= 0) {
      qty = 1
      unit = unitOf(toks[k])
      used.add(k)
    }
  }
  const query = toks.filter((t, i) => !used.has(i) && !/^\d/.test(t) && !STOP.has(t))
  return { qty, unit, query: query.map(stem) }
}

/** Cantidad que tiene al inicio la porción ("1 taza"→1, "½ taza"→0.5, "⅓ taza"→0.33, "3 piezas"→3). */
function leadingCount(label: string): number {
  const l = label.trim()
  const frac: Record<string, number> = { '½': 0.5, '⅓': 1 / 3, '¼': 0.25, '¾': 0.75, '⅔': 2 / 3 }
  if (frac[l[0] ?? '']) return frac[l[0]!]!
  const m = l.match(/^(\d+(?:[.,]\d+)?)/)
  return m ? Number(m[1]!.replace(',', '.')) || 1 : 1
}

const UNIT_WORDS: Partial<Record<UnitKey, string[]>> = {
  taza: ['taza'], vaso: ['vaso'], cda: ['cda', 'cucharada'], cdita: ['cdita', 'cucharadita'], lata: ['lata'],
  rebanada: ['rebanada'], scoop: ['scoop'], puno: ['puno'], plato: ['plato'], porcion: ['porcion'],
}
const DEFAULT_GRAMS: Partial<Record<UnitKey, number>> = { taza: 240, vaso: 240, cda: 15, cdita: 5, lata: 355, rebanada: 30, scoop: 30, puno: 28, plato: 250, porcion: 100 }

/** Gramos de `qty` × `unit` de un alimento, y de dónde salió la cifra. */
export function resolveGrams(food: Food, qty: number | null, unit: UnitKey | null): { grams: number; basis: Basis } {
  const q = qty ?? 1
  if (unit === 'g' || unit === 'ml') return { grams: round(q), basis: 'peso' }
  if (unit === 'kg' || unit === 'l') return { grams: round(q * 1000), basis: 'peso' }
  if (unit === null && qty != null && qty >= 25) return { grams: round(qty), basis: 'peso' } // "pollo 200"

  const perServing = (s: Food['servings'][number]) => s.grams / leadingCount(s.label)
  if (unit && UNIT_WORDS[unit]) {
    const words = UNIT_WORDS[unit]!
    const s = food.servings.find((x) => words.some((w) => norm(x.label).includes(w)))
    if (s) return { grams: round(q * perServing(s)), basis: 'porcion' }
    return { grams: round(q * (DEFAULT_GRAMS[unit] ?? 100)), basis: 'estimado' }
  }
  // pieza o sin unidad: la porción natural del alimento ("1 huevo" = 50 g)
  const s = food.servings[0]
  if (s) return { grams: round(q * perServing(s)), basis: 'porcion' }
  return { grams: round(q * 100), basis: 'estimado' }
}

const round = (n: number) => Math.round(n)

/** Cómo lo dice la gente → palabras que están en los nombres de la base. */
const SYNONYMS: Record<string, string[]> = {
  coca: ['refresco', 'cola'], pepsi: ['refresco', 'cola'], yogurt: ['yogur'], pechuga: ['pechuga'], whey: ['proteina', 'whey'],
}

function pickFood(foods: Food[], said: string[], recent: ReadonlyMap<string, number>): Food | null {
  if (!said.length) return null
  const query = said.flatMap((t) => SYNONYMS[t] ?? [t])
  // el alimento "de siempre" para palabras sueltas como leche o pollo, aunque haya más palabras (a la plancha, revueltos…)
  const prefs = new Set(said.map((t) => PREFERRED[t]).filter((x): x is string => !!x))
  let best: { food: Food; score: number } | null = null
  for (const food of foods) {
    const ft = tokensOf(`${food.name} ${food.brand ?? ''}`)
    const hits = query.filter((q) => ft.some((t) => sameToken(q, t))).length
    if (hits === 0 || hits < Math.ceil(query.length / 2)) continue
    const nameToks = tokensOf(food.name)
    let score = hits * 10 - nameToks.length * 0.5
    if (hits === query.length) score += 3
    if (nameToks[0] && query.some((q) => sameToken(q, nameToks[0]!))) score += 2
    if (nameToks.join(' ') === query.join(' ')) score += 6
    if (prefs.has(norm(food.name))) score += 5
    if (/cocid/.test(norm(food.name))) score += 0.3
    if (/crud/.test(norm(food.name)) && !query.includes('crudo') && !query.includes('cruda')) score -= 0.3
    const r = recent.get(food.id)
    if (r !== undefined) score += Math.max(0, 1 - r * 0.05)
    if (food.source === 'custom') score += 1
    if (!best || score > best.score) best = { food, score }
  }
  return best?.food ?? null
}

/** ¿El alimento tiene que ver con lo que se buscó? (al menos una palabra en común). Para filtrar resultados de internet. */
export function relevantTo(food: Food, query: string): boolean {
  const q = query.split(/\s+/).filter(Boolean).map(stem)
  const ft = tokensOf(`${food.name} ${food.brand ?? ''}`)
  return q.some((t) => ft.some((f) => sameToken(t, f)))
}

/** Resultados de internet relevantes, con el nombre más parecido a lo dicho primero ("Sushi" antes que "Arroz para sushi"). */
export function rankWebResults(foods: Food[], query: string): Food[] {
  const q = query.split(/\s+/).filter(Boolean).map(stem)
  const score = (f: Food) => {
    const nt = tokensOf(f.name)
    const all = q.every((t) => nt.some((n) => sameToken(t, n)))
    return (nt.join(' ') === q.join(' ') ? 10 : 0) + (all ? 3 : 0) + (nt[0] && q.some((t) => sameToken(t, nt[0]!)) ? 1 : 0) - nt.length * 0.2
  }
  return foods.filter((f) => relevantTo(f, query)).sort((a, b) => score(b) - score(a))
}

/** Interpreta la descripción y la empata con alimentos de la base. */
export function describeMeal(text: string, foods: Food[], recentIds: readonly string[] = []): DescribedItem[] {
  const recent = new Map(recentIds.map((id, i) => [id, i]))
  const out: DescribedItem[] = []
  for (const chunk of splitDescription(text)) {
    const p = parseChunk(chunk)
    if (!p.query.length) continue
    const food = pickFood(foods, p.query, recent)
    const { grams, basis } = food ? resolveGrams(food, p.qty, p.unit) : { grams: 0, basis: 'estimado' as Basis }
    out.push({ text: chunk, query: p.query.join(' '), qty: p.qty, unit: p.unit, food, grams, basis })
  }
  return out
}

/** Si el usuario cambia el alimento de un renglón, se conserva lo que dijo (cantidad y unidad). */
export function withFood(item: DescribedItem, food: Food): DescribedItem {
  return { ...item, food, ...resolveGrams(food, item.qty, item.unit) }
}
