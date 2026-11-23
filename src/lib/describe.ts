// Registrar comida describiéndola ("2 huevos con 3 tortillas y un vaso de leche").
// Todo se resuelve en el dispositivo contra tu base de alimentos: sin internet y sin enviar nada a ningún servicio.
import type { Food } from '../db/schema'
import { expandDish, findDish, isToppingPart, isVariantPart, type Dish, type DishPart } from './dishes'
import { norm } from './text'
import { contentTokens, NOISE, sameToken, STOP, stem, tokensOf } from './tokens'

export { stem }

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
  /** Si es parte de un platillo armado ("Hamburguesa con tocino"): nombre del platillo. */
  group?: string
  /** Identifica el platillo (dos hamburguesas distintas tienen claves distintas). */
  groupKey?: number
  /** Aclaración sobre lo que se supuso; solo en el primer renglón del platillo. */
  groupNote?: string
}

export type UnitKey = 'g' | 'kg' | 'ml' | 'l' | 'taza' | 'vaso' | 'cda' | 'cdita' | 'lata' | 'rebanada' | 'pieza' | 'scoop' | 'puno' | 'plato' | 'porcion' | 'par' | 'orden'

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
  [/^(orden|ordenes)$/, 'orden'],
]

interface Seg {
  text: string
  /** Cómo se unió con lo anterior: "con", "y" (también "más", "+") o coma/salto de línea. */
  sep: 'inicio' | 'con' | 'y' | 'coma'
}

/** Parte la frase en fragmentos y recuerda con qué palabra se unió cada uno. */
export function segments(text: string): Seg[] {
  const t = norm(text)
    .replace(/(\d),(\d)/g, '$1.$2')
    .replace(/½/g, ' 0.5 ')
    .replace(/¼/g, ' 0.25 ')
    .replace(/¾/g, ' 0.75 ')
    .replace(/(\d)([a-z])/g, '$1 $2')
    .replace(/([a-z])(\d)/g, '$1 $2')
    // "una taza y media de arroz" → "1.5 taza de arroz"
    .replace(/\b(un|una|uno|dos|tres|cuatro|\d+)\s+(taza|tazas|vaso|vasos|plato|platos|cucharada|cucharadas|rebanada|rebanadas|pieza|piezas|lata|latas|litro|litros|kilo|kilos|porcion|porciones)\s+y\s+medi[oa]\b/g, (_m, n: string, u: string) => `${(NUM_WORDS[n] ?? Number(n)) + 0.5} ${u}`)
    // pizzas enteras: se cuentan en rebanadas (8 por pizza)
    .replace(/\bmedia pizza\b/g, '4 rebanadas de pizza')
    .replace(/\b(un|una|uno|dos|tres|\d+)\s+pizzas?(?!\s+de\s+\d)\b/g, (_m, n: string) => `${(NUM_WORDS[n] ?? Number(n)) * 8} rebanadas de pizza`)
  const out: Seg[] = []
  let sep: Seg['sep'] = 'inicio'
  t.split(/(\s(?:y|e|con|mas)\s|[,;\n+&])/).forEach((part, i) => {
    if (i % 2 === 0) {
      const chunk = part.trim()
      if (chunk) out.push({ text: chunk, sep })
      return
    }
    const w = part.trim()
    sep = w === 'con' ? 'con' : w === '' || w === ',' || w === ';' ? 'coma' : 'y'
  })
  return out
}

/** Parte la frase en alimentos: comas, "y", "con", "más", saltos de línea. */
export function splitDescription(text: string): string[] {
  return segments(text).map((s) => s.text)
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
  rebanada: ['rebanada'], scoop: ['scoop'], puno: ['puno'], plato: ['plato'], porcion: ['porcion'], orden: ['orden'],
}
const DEFAULT_GRAMS: Partial<Record<UnitKey, number>> = { taza: 240, vaso: 240, cda: 15, cdita: 5, lata: 355, rebanada: 30, scoop: 30, puno: 28, plato: 250, porcion: 100, orden: 150 }

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
  // pieza o sin unidad: la porción natural del alimento ("1 huevo" = 50 g); sin cantidad, una porción entera ("6 nuggets", "⅓ taza")
  const s = food.servings[0]
  if (s) return { grams: round(qty == null ? s.grams : q * perServing(s)), basis: 'porcion' }
  return { grams: round(q * 100), basis: 'estimado' }
}

const round = (n: number) => Math.round(n)

const nameTokens = new WeakMap<Food, { name: string[]; phrases: string[][]; all: string[] }>()
function tokensFor(food: Food) {
  let t = nameTokens.get(food)
  if (!t) {
    const name = contentTokens(food.name)
    const phrases = [name, ...(food.aka ?? []).map(contentTokens)]
    const all = [...new Set([...phrases.flat(), ...contentTokens(food.brand ?? '')])]
    t = { name, phrases, all }
    nameTokens.set(food, t)
  }
  return t
}

function pickFood(foods: Food[], said: string[], recent: ReadonlyMap<string, number>): Food | null {
  if (!said.length) return null
  const query = said
  const joined = query.join(' ')
  // las palabras raras ("cuernito") pesan más que las comunes ("jamón"): dicen mejor de qué se trata
  const idf = query.map((q) => {
    const df = foods.filter((f) => tokensFor(f).all.some((t) => sameToken(q, t))).length
    return df ? Math.log(foods.length / df) : 0
  })
  let best: { food: Food; score: number } | null = null
  for (const food of foods) {
    const { name, phrases, all } = tokensFor(food)
    const matched = query.map((q) => all.some((t) => sameToken(q, t)))
    const hits = matched.filter(Boolean).length
    if (hits === 0 || hits < Math.ceil(query.length / 2)) continue
    let score = hits * 10 - name.length * 0.5
    score += idf.reduce((sum, w, i) => sum + (matched[i] ? w * 0.5 : 0), 0)
    if (hits === query.length) score += 3
    if (name[0] && query.some((q) => sameToken(q, name[0]!))) score += 2
    if (phrases.some((p) => p.join(' ') === joined)) score += 6
    // el alimento "de siempre" para palabras sueltas como leche o pollo
    if ((query.length === 1 || hits === query.length) && food.dflt?.some((d) => query.some((q) => sameToken(q, stem(norm(d)))))) score += 5
    const nm = norm(food.name)
    if (/cocid/.test(nm)) score += 0.3
    if (/crud/.test(nm) && !query.includes('crudo') && !query.includes('cruda')) score -= 0.3
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

const SIZE_WORDS: Record<string, number> = { chico: 0.75, chica: 0.75, pequeno: 0.75, pequena: 0.75, mini: 0.5, grande: 1.35, grand: 1.35, jumbo: 1.6, gigante: 1.6, xl: 1.6, mediano: 1, mediana: 1 }

/** Separa los adjetivos que no cambian el alimento ("ahumada", "casera"). */
function cleanQuery(query: string[]): { words: string[]; adjectives: string[] } {
  return { words: query.filter((t) => !NOISE.has(t)), adjectives: query.filter((t) => NOISE.has(t)) }
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

/** Interpreta la descripción y la empata con alimentos de la base (y arma platillos como hamburguesas o tacos). */
export function describeMeal(text: string, foods: Food[], recentIds: readonly string[] = []): DescribedItem[] {
  const recent = new Map(recentIds.map((id, i) => [id, i]))
  const byName = new Map<string, Food>()
  for (const f of foods) {
    const k = norm(f.name)
    const cur = byName.get(k)
    if (!cur || (f.source === 'local' && cur.source !== 'local')) byName.set(k, f)
  }
  const lookup = (name: string) => byName.get(norm(name))
  const resolve = (food: Food, qty: number | null, unit: UnitKey | null) => resolveGrams(food, qty, unit).grams

  const out: DescribedItem[] = []
  let groups = 0
  let lastDish: Dish | null = null
  const segs = segments(text)

  /** Arma un platillo con sus ajustes; null si no se pudo armar con los alimentos disponibles. */
  const buildDish = (dish: Dish, parts: DishPart[], plural: boolean, adjectives: string[]): DescribedItem[] | null => {
    const res = expandDish(dish, parts, { plural }, lookup, resolve)
    if (!res) return null
    // un platillo de un solo ingrediente (café, taco de canasta) es un renglón normal
    if (res.rows.length === 1) {
      const r = res.rows[0]!
      return [{ text: r.food.name, query: r.food.name, qty: null, unit: null, food: r.food, grams: r.grams, basis: 'porcion' as Basis }]
    }
    const said = res.labels.length ? res.labels : res.headWords.length ? [`de ${res.headWords.join(' ')}`] : []
    const name =
      (res.count !== 1 ? `${Math.round(res.count * 100) / 100} × ` : '') +
      [dish.name, ...said, ...adjectives, res.said].filter(Boolean).join(' ')
    const note = [
      res.assumed ? dish.assume : '',
      'Usé porciones típicas de cada ingrediente: ajusta los gramos si el tuyo fue distinto.',
      res.ignored.length ? `No tomé en cuenta: ${res.ignored.join(', ')}.` : '',
    ]
      .filter(Boolean)
      .join(' ')
    const key = ++groups
    return res.rows.map((r, i) => ({
      text: name,
      query: r.food.name,
      qty: null,
      unit: null,
      food: r.food,
      grams: r.grams,
      basis: 'porcion' as Basis,
      group: cap(name),
      groupKey: key,
      ...(i === 0 ? { groupNote: note } : {}),
    }))
  }

  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i]!
    const p = parseChunk(seg.text)
    const { words, adjectives } = cleanQuery(p.query)
    if (!words.length) continue

    // "3 de bistec" justo después de "3 tacos de pastor": otra tanda del mismo platillo
    let hit = findDish(words, seg.text)
    if (!hit && lastDish && seg.sep !== 'con' && p.qty != null && /^\S+\s+de\s/.test(seg.text) && isVariantPart(lastDish, words)) {
      hit = { dish: lastDish, rest: words, plural: false }
    }
    if (hit) {
      const parts: DishPart[] = [{ tokens: hit.rest, qty: p.qty, unit: p.unit, sep: seg.sep }]
      let j = i + 1
      while (j < segs.length) {
        const nx = segs[j]!
        const pp = parseChunk(nx.text)
        const q = cleanQuery(pp.query).words
        // "con tocino", "y jitomate", "sin cebolla": ajustes del platillo; "y 2 vasos de leche" o "y 2 huevos" son otra cosa
        if (!q.length || findDish(q) || !isToppingPart(hit.dish, q)) break
        if (nx.sep !== 'con' && pp.qty != null && pp.unit == null) break
        parts.push({ tokens: q, qty: pp.qty, unit: pp.unit, sep: nx.sep })
        j++
      }
      const rows = buildDish(hit.dish, parts, hit.plural, adjectives)
      if (rows) {
        out.push(...rows)
        lastDish = hit.dish
        i = j - 1
        continue
      }
    }

    lastDish = null
    // tamaño ("una manzana grande", "taza chica de arroz")
    let size = 1
    const said = words.filter((t) => {
      const f = SIZE_WORDS[t]
      if (f === undefined) return true
      size *= f
      return false
    })
    if (!said.length) continue
    // "papas" a secas, en plural, son papas fritas; en singular o cocidas, la papa
    if (said.length === 1 && said[0] === 'papa' && /\bpapas\b/.test(seg.text)) said.push('frita')
    const food = pickFood(foods, said, recent)
    let { grams, basis } = food ? resolveGrams(food, p.qty, p.unit) : { grams: 0, basis: 'estimado' as Basis }
    if (food && size !== 1 && basis !== 'peso') grams = Math.round(grams * size)
    out.push({ text: seg.text, query: said.join(' '), qty: p.qty, unit: p.unit, food, grams, basis })
  }
  return out
}

/** Si el usuario cambia el alimento de un renglón, se conserva lo que dijo (cantidad y unidad). */
export function withFood(item: DescribedItem, food: Food): DescribedItem {
  if (item.group) return { ...item, food } // en un platillo se conservan los gramos del ingrediente
  return { ...item, food, ...resolveGrams(food, item.qty, item.unit) }
}
