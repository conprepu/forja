// Platillos armables ("hamburguesa de res con tocino", "3 tacos de bistec sin cebolla").
// Cada platillo se descompone en ingredientes con porciones típicas (src/data/dishes.json); lo que dice la persona
// (variante, extras, "sin…", "doble", tamaño, cantidad) ajusta esa receta base. Todo local y determinista.
import dishesJson from '../data/dishes.json'
import type { Food } from '../db/schema'
import type { UnitKey } from './describe'
import { contentTokens, NOISE, sameToken, stem } from './tokens'

export interface DishComp {
  /** Nombre exacto del alimento en la base. */
  f: string
  g: number
  /** Palabras con las que se nombra en "sin …" / "doble …". */
  k?: string[]
  /** Es el ingrediente principal (la carne): lo que cambia la variante y lo que duplica "doble". */
  main?: boolean
}

interface Variant {
  words: string[]
  label: string
  /** Cambia el ingrediente principal. */
  main?: DishComp[]
  add?: DishComp[]
  swap?: Record<string, DishComp>
  /** Reemplaza toda la receta base. */
  replace?: DishComp[]
  /** Quita ingredientes de la base (por palabra clave). */
  drop?: string[]
  /** También vale cuando se dice después de "con" ("licuado de fresa con plátano"). */
  asExtra?: boolean
}

interface Extra {
  words: string[]
  items: DishComp[]
}

export interface Dish {
  id: string
  name: string
  words: string[]
  /** Cuántas piezas son "los tacos" cuando no dicen número. */
  plural?: number
  /** Piezas de "una orden de …". */
  orden?: number
  /** Qué se duplica con "doble" (por defecto, el ingrediente principal). */
  doble?: string[]
  assume: string
  base: DishComp[]
  variants: Variant[]
  extras: Extra[]
}

export const DISHES = dishesJson as unknown as Dish[]

const FACTOR: Record<string, number> = { doble: 2, dobl: 2, triple: 3, tripl: 3, extra: 2, mucho: 2, mucha: 2, poquito: 0.5, poquita: 0.5 }
const SIZE: Record<string, number> = { chico: 0.75, chica: 0.75, pequeno: 0.75, pequena: 0.75, mini: 0.5, grande: 1.35, grand: 1.35, jumbo: 1.6, gigante: 1.6, xl: 1.6, mediano: 1, mediana: 1 }

const ACCENT: Record<string, string> = { pina: 'piña', jalapeno: 'jalapeño', champinon: 'champiñón', jamon: 'jamón', atun: 'atún', camaron: 'camarón', azucar: 'azúcar', proteina: 'proteína', platano: 'plátano', cafe: 'café', limon: 'limón', sandwich: 'sándwich' }
const show = (t: string) => ACCENT[t] ?? t

interface CompiledDish {
  dish: Dish
  words: string[][]
  recognized: string[]
  variantWords: string[]
}

const compiled: CompiledDish[] = DISHES.map((dish) => {
  const keys = new Set<string>(['sin', ...Object.keys(FACTOR), ...Object.keys(SIZE), ...NOISE])
  const add = (s: string) => contentTokens(s).forEach((t) => keys.add(t))
  for (const c of dish.base) {
    ;(c.k ?? []).forEach((k) => keys.add(stem(k)))
    add(c.f)
  }
  const variantWords = new Set<string>()
  for (const v of dish.variants) {
    v.words.forEach((w) => contentTokens(w).forEach((t) => variantWords.add(t)))
    // un "con …" solo puede ser una variante si esa variante se puede sumar; reemplazar toda la receta no
    if (!v.replace || v.asExtra) v.words.forEach(add)
    ;[...(v.main ?? []), ...(v.add ?? []), ...(v.replace ?? []), ...Object.values(v.swap ?? {})].forEach((c) => add(c.f))
  }
  for (const e of dish.extras) e.words.forEach(add)
  return { dish, words: dish.words.map(contentTokens), recognized: [...keys], variantWords: [...variantWords] }
})

const isRecognized = (c: CompiledDish, t: string) => c.recognized.some((r) => sameToken(r, t))

export interface DishHit {
  dish: Dish
  /** Tokens del fragmento sin las palabras que nombran al platillo. */
  rest: string[]
  /** El platillo se dijo en plural ("tacos"): sin número, son varios. */
  plural: boolean
}

/** ¿El fragmento (palabras ya normalizadas) nombra un platillo armable? Gana la frase más larga. */
export function findDish(tokens: string[], rawText = ''): DishHit | null {
  let best: { c: CompiledDish; phrase: string[]; len: number } | null = null
  for (const c of compiled) {
    for (const phrase of c.words) {
      if (!phrase.length || !phrase.every((p) => tokens.some((t) => sameToken(t, p)))) continue
      if (!best || phrase.length > best.len) best = { c, phrase, len: phrase.length }
    }
  }
  if (!best) return null
  const rest = [...tokens]
  for (const p of best.phrase) {
    const i = rest.findIndex((t) => sameToken(t, p))
    if (i >= 0) rest.splice(i, 1)
  }
  const plural = best.c.dish.words.some((w) => new RegExp(`\\b${w}(s|es)\\b`).test(rawText))
  return { dish: best.c.dish, rest, plural }
}

/** ¿Este fragmento ("tocino", "doble queso", "sin cebolla") es solo un ajuste del platillo y no otra comida? */
export function isToppingPart(dish: Dish, tokens: string[]): boolean {
  const c = compiled.find((x) => x.dish === dish)
  return !!c && tokens.length > 0 && tokens.every((t) => isRecognized(c, t))
}

/** ¿El fragmento ("bistec") es una variante de este platillo? Sirve para "3 de pastor y 2 de bistec". */
export function isVariantPart(dish: Dish, tokens: string[]): boolean {
  const c = compiled.find((x) => x.dish === dish)
  if (!c || !tokens.length || !tokens.every((t) => isRecognized(c, t) || c.variantWords.some((w) => sameToken(w, t)))) return false
  return dish.variants.some((v) => v.words.some((w) => contentTokens(w).every((p) => tokens.some((t) => sameToken(t, p)))))
}

export interface DishPart {
  tokens: string[]
  qty: number | null
  unit: UnitKey | null
  /** Cómo se unió al platillo: "con", "y" o coma. */
  sep: string
}

export interface DishRow {
  food: Food
  grams: number
}

export interface DishResult {
  rows: DishRow[]
  /** Etiquetas de las variantes que se aplicaron ("de bistec"). */
  labels: string[]
  /** Lo que dijeron del platillo sin que cambiara la receta ("de jamón", "de carne"). */
  headWords: string[]
  /** No dijeron cuál variante: se usó la de siempre. */
  assumed: boolean
  /** Palabras que no supe usar. */
  ignored: string[]
  /** Cuántos platillos son (número que dijeron o el plural). */
  count: number
  /** Texto de los ajustes dichos ("con tocino y jitomate", "sin cebolla"). */
  said: string
}

interface Comp {
  f: string
  g: number
  keys: string[]
  main: boolean
  /** Gramos ya definidos por una cantidad dicha ("con 2 rebanadas de tocino"). */
  fixed?: number
}

const compOf = (c: DishComp, extraKeys: string[] = []): Comp => ({
  f: c.f,
  g: c.g,
  main: !!c.main,
  keys: [...new Set([...(c.k ?? []).map(stem), ...extraKeys, ...contentTokens(c.f)])],
})

const hasKey = (c: Comp, t: string) => c.keys.some((k) => sameToken(k, t))

interface Tok {
  t: string
  part: number
  used: boolean
  /** Qué lo consumió: una variante (queda en la etiqueta) o un extra (queda en el texto). */
  by?: 'variant' | 'extra'
}

/** Marca y devuelve los índices de los tokens libres que forman la frase, o null. */
function takePhrase(flat: Tok[], phrase: string[], onlyPart?: number, minPart = 0): number[] | null {
  const idx: number[] = []
  for (const p of phrase) {
    const i = flat.findIndex((x, j) => !x.used && !idx.includes(j) && (onlyPart === undefined || x.part === onlyPart) && x.part >= minPart && sameToken(x.t, p))
    if (i < 0) return null
    idx.push(i)
  }
  return idx
}

/**
 * Arma el platillo: receta base + variante + extras − "sin…", escalado por "doble", tamaño y cantidad.
 * `resolve` convierte una cantidad dicha de un alimento (2 rebanadas de tocino) en gramos.
 */
export function expandDish(
  dish: Dish,
  parts: DishPart[],
  hit: Pick<DishHit, 'plural'>,
  byName: (name: string) => Food | undefined,
  resolve: (food: Food, qty: number | null, unit: UnitKey | null) => number,
): DishResult | null {
  const flat: Tok[] = parts.flatMap((p, part) => p.tokens.map((t) => ({ t, part, used: false })))
  const mark = (ix: number[], by: 'variant' | 'extra') => ix.forEach((i) => ((flat[i]!.used = true), (flat[i]!.by = by)))

  let comps: Comp[] = dish.base.map((c) => compOf(c))
  const labels: string[] = []
  const removals: string[] = []
  const compFactors: { t: string; f: number }[] = []
  let globalFactor = 1
  let size = 1
  let mainReplaced = false

  const isTarget = (t: string) =>
    comps.some((c) => hasKey(c, t)) ||
    dish.variants.some((v) => v.words.some((w) => contentTokens(w).some((p) => sameToken(p, t)))) ||
    dish.extras.some((e) => e.words.some((w) => contentTokens(w).some((p) => sameToken(p, t))))

  // "sin cebolla ni jitomate": todo lo que sigue en ese fragmento se quita
  flat.forEach((x, i) => {
    if (x.used || x.t !== 'sin') return
    x.used = true
    for (let j = i + 1; j < flat.length && flat[j]!.part === x.part; j++) {
      flat[j]!.used = true
      removals.push(flat[j]!.t)
    }
  })

  // tamaño y "doble / triple / extra / mucho"
  flat.forEach((x, i) => {
    if (x.used) return
    const s = SIZE[x.t]
    if (s !== undefined) {
      size *= s
      x.used = true
      return
    }
    const f = FACTOR[x.t]
    if (f === undefined) return
    x.used = true
    const next = flat.find((y, j) => j > i && !y.used && y.part === x.part)
    const prev = i > 0 && flat[i - 1]!.part === x.part ? flat[i - 1]! : undefined
    if (next && isTarget(next.t)) compFactors.push({ t: next.t, f })
    else if (prev && isTarget(prev.t)) compFactors.push({ t: prev.t, f })
    else if (f >= 2) globalFactor *= f
  })

  /** Aplica una variante. `additive`: se suma al platillo en vez de cambiar su ingrediente principal. */
  const applyVariant = (v: Variant, additive: boolean) => {
    if (v.replace) {
      comps = v.replace.map((c) => compOf(c))
      mainReplaced = true
    }
    v.drop?.forEach((k) => (comps = comps.filter((c) => !hasKey(c, stem(k)))))
    if (v.main) {
      const fresh = v.main.map((c) => compOf({ ...c, main: !additive }))
      let at: number
      if (!mainReplaced && !additive) {
        const first = comps.findIndex((c) => c.main)
        at = first >= 0 ? first : comps.length
        comps = comps.filter((c) => !c.main)
        mainReplaced = true
      } else {
        const last = comps.map((c) => c.main).lastIndexOf(true)
        at = last >= 0 ? last + 1 : comps.length
      }
      comps.splice(at, 0, ...fresh)
    }
    for (const [key, to] of Object.entries(v.swap ?? {})) {
      const i = comps.findIndex((c) => hasKey(c, stem(key)))
      if (i >= 0) comps[i] = { ...compOf(to), keys: [...new Set([...comps[i]!.keys, ...compOf(to).keys])] }
    }
    if (v.add) comps.push(...v.add.map((c) => compOf(c)))
  }

  // variantes: las del platillo salen del primer fragmento; las marcadas asExtra también de los "con …"
  for (const v of dish.variants) {
    let hitIx: number[] | null = null
    for (const w of v.words) {
      hitIx = takePhrase(flat, contentTokens(w), v.asExtra ? undefined : 0)
      if (hitIx) break
    }
    if (!hitIx) continue
    mark(hitIx, 'variant')
    labels.push(v.label)
    applyVariant(v, false)
  }

  // extras ("con tocino", "con 2 rebanadas de tocino")
  const extraHits: { ix: number[]; extra: Extra }[] = []
  for (const e of dish.extras) {
    for (const w of e.words) {
      const ix = takePhrase(flat, contentTokens(w))
      if (!ix) continue
      mark(ix, 'extra')
      extraHits.push({ ix, extra: e })
      break
    }
  }
  for (const { ix, extra } of extraHits) {
    const part = parts[flat[ix[0]!]!.part]!
    const sameCount = extraHits.filter((h) => flat[h.ix[0]!]!.part === flat[ix[0]!]!.part).length
    const wordKeys = extra.words.flatMap(contentTokens)
    for (const item of extra.items) {
      const have = comps.find((c) => c.f === item.f)
      if (have) {
        wordKeys.forEach((k) => !have.keys.includes(k) && have.keys.push(k))
        continue
      }
      const c = compOf(item, wordKeys)
      const food = byName(item.f)
      if (food && part.qty != null && sameCount === 1 && extra.items.length === 1) c.fixed = resolve(food, part.qty, part.unit)
      comps.push(c)
    }
  }

  // "taco con pollo": si no dijeron cuál era, es la variante; si ya la dijeron ("torta de huevo con chorizo"), se suma
  for (const v of dish.variants) {
    if (v.asExtra || v.replace || !(v.main || v.add)) continue
    let hitIx: number[] | null = null
    for (const w of v.words) {
      hitIx = takePhrase(flat, contentTokens(w), undefined, 1)
      if (hitIx) break
    }
    if (!hitIx) continue
    const additive = mainReplaced
    mark(hitIx, additive ? 'extra' : 'variant')
    if (!additive) labels.push(v.label)
    applyVariant(v, additive)
  }

  // quitar lo que dijeron "sin"
  for (const t of removals) comps = comps.filter((c) => !hasKey(c, t))

  // factores por ingrediente ("doble queso")
  for (const { t, f } of compFactors) for (const c of comps) if (hasKey(c, t)) c.g *= f
  const dobleKeys = dish.doble ?? ['main']
  if (globalFactor !== 1) {
    for (const c of comps) if (dobleKeys.some((k) => (k === 'main' ? c.main : hasKey(c, stem(k))))) c.g *= globalFactor
    labels.push(globalFactor === 2 ? 'doble' : globalFactor === 3 ? 'triple' : 'extra')
  }

  // cantidad: número dicho, unidad de peso o el plural
  const head = parts[0]!
  const stdTotal = comps.reduce((s, c) => s + (c.fixed ?? c.g), 0)
  let count = head.qty ?? (hit.plural ? (dish.plural ?? 2) : 1)
  let scale = count
  if (head.unit === 'g' || head.unit === 'ml') {
    scale = stdTotal > 0 ? (head.qty ?? 0) / stdTotal : 1
    count = 1
  } else if (head.unit === 'kg' || head.unit === 'l') {
    scale = stdTotal > 0 ? ((head.qty ?? 0) * 1000) / stdTotal : 1
    count = 1
  } else if (head.unit === 'orden') {
    count = (head.qty ?? 1) * (dish.orden ?? 1)
    scale = count
  }

  // juntar repetidos y resolver alimentos
  const merged = new Map<string, number>()
  for (const c of comps) {
    const g = c.fixed !== undefined ? c.fixed : c.g * size * scale
    merged.set(c.f, (merged.get(c.f) ?? 0) + g)
  }
  const rows: DishRow[] = []
  for (const [name, g] of merged) {
    const food = byName(name)
    if (food && g > 0) rows.push({ food, grams: Math.round(g) })
  }
  if (!rows.length) return null

  const known = compiled.find((x) => x.dish === dish)!
  const ignored = flat.filter((x) => !x.used && x.part > 0 && !isRecognized(known, x.t) && x.t.length > 2).map((x) => x.t)
  const headWords = flat.filter((x) => x.part === 0 && (!x.used || x.by === 'extra')).map((x) => show(x.t))
  // lo que dijeron después de "con" / "sin", salvo lo que ya quedó en la etiqueta de la variante
  const wordsOf = (pi: number) => (flat.some((x) => x.part === pi && x.by === 'variant') ? [] : flat.filter((x) => x.part === pi).map((x) => show(x.t)))
  const headExtra = labels.length ? flat.filter((x) => x.part === 0 && x.by === 'extra').map((x) => show(x.t)) : []
  const later = [headExtra, ...parts.map((_, pi) => wordsOf(pi)).slice(1)].filter((w) => w.length)
  const withs = later.filter((w) => w[0] !== 'sin')
  const sins = later.filter((w) => w[0] === 'sin')
  const headIx = flat.findIndex((x) => x.part === 0 && x.t === 'sin')
  const headSin = headIx >= 0 ? wordsOf(0).slice(wordsOf(0).indexOf('sin')) : []
  const said = [withs.length ? `con ${withs.map((w) => w.join(' ')).join(' y ')}` : '', ...sins.map((w) => w.join(' ')), headSin.join(' ')]
    .filter(Boolean)
    .join(' ')

  return {
    rows,
    labels,
    headWords,
    assumed: !mainReplaced,
    ignored: [...new Set(ignored)].slice(0, 4).map(show),
    count,
    said,
  }
}
