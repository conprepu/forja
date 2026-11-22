// Cliente de Open Food Facts (gratis, sin llave). Las funciones reciben `fetch` para poder probarlas sin red.
import type { Food } from '../db/schema'
import { kcalFromMacros, r1 } from './nutrition'

export const OFF_BASE = 'https://world.openfoodfacts.org'
const FIELDS = 'code,product_name,generic_name,brands,nutriments,serving_size,serving_quantity'

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v)

/** Número de un campo de OFF, que a veces llega como texto. */
function n(v: unknown): number | null {
  const x = typeof v === 'number' ? v : typeof v === 'string' ? parseFloat(v.replace(',', '.')) : NaN
  return Number.isFinite(x) && x >= 0 ? x : null
}

/** Convierte un producto de OFF a un alimento por 100 g. null si no trae información nutrimental usable. */
export function parseOffProduct(raw: unknown): Food | null {
  if (!isObj(raw)) return null
  const code = typeof raw.code === 'string' ? raw.code : typeof raw.code === 'number' ? String(raw.code) : ''
  const nut = isObj(raw.nutriments) ? raw.nutriments : null
  if (!code || !nut) return null

  const p = n(nut.proteins_100g)
  const c = n(nut.carbohydrates_100g)
  const f = n(nut.fat_100g)
  let kcal = n(nut['energy-kcal_100g'])
  if (kcal == null) {
    const kj = n(nut.energy_100g) ?? n(nut['energy-kj_100g'])
    if (kj != null) kcal = kj / 4.184
  }
  if (kcal == null && (p != null || c != null || f != null)) kcal = kcalFromMacros({ p: p ?? 0, c: c ?? 0, f: f ?? 0 })
  if (kcal == null) return null

  const name = [raw.product_name, raw.generic_name].find((x): x is string => typeof x === 'string' && x.trim() !== '')?.trim()
  const brand = typeof raw.brands === 'string' ? raw.brands.split(',')[0]?.trim() : undefined
  const fiber = n(nut.fiber_100g)
  const grams = n(raw.serving_quantity)
  const label = typeof raw.serving_size === 'string' ? raw.serving_size.trim() : ''

  return {
    id: `off-${code}`,
    name: name ?? 'Producto sin nombre',
    ...(brand ? { brand } : {}),
    barcode: code,
    per100: { kcal: Math.round(kcal), p: r1(p ?? 0), c: r1(c ?? 0), f: r1(f ?? 0), ...(fiber != null ? { fiber: r1(fiber) } : {}) },
    servings: grams && grams > 0 ? [{ label: label || `${grams} g`, grams }] : [],
    source: 'off',
  }
}

/** Respuesta de /api/v2/product/{código}: status 1 = encontrado. */
export function parseOffProductResponse(json: unknown): Food | null {
  if (!isObj(json) || json.status === 0) return null
  return parseOffProduct(isObj(json.product) ? { code: json.code, ...json.product } : null)
}

/** Respuesta de búsqueda: descarta productos sin datos y repetidos. */
export function parseOffSearchResponse(json: unknown): Food[] {
  const products = isObj(json) && Array.isArray(json.products) ? json.products : []
  const seen = new Set<string>()
  const out: Food[] = []
  for (const p of products) {
    const food = parseOffProduct(p)
    if (food && !seen.has(food.id)) {
      seen.add(food.id)
      out.push(food)
    }
  }
  return out
}

export const productUrl = (barcode: string): string =>
  `${OFF_BASE}/api/v2/product/${encodeURIComponent(barcode)}.json?fields=${FIELDS}`

export const searchUrl = (query: string, pageSize = 20): string =>
  `${OFF_BASE}/cgi/search.pl?search_terms=${encodeURIComponent(query.trim())}&search_simple=1&action=process&json=1&page_size=${pageSize}&sort_by=unique_scans_n&fields=${FIELDS}`

type Fetch = (url: string, init?: { signal?: AbortSignal }) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>

export class OffError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OffError'
  }
}

async function getJson(fetchFn: Fetch, url: string, signal?: AbortSignal): Promise<unknown> {
  let res
  try {
    res = await fetchFn(url, { signal })
  } catch (e) {
    if ((e as DOMException)?.name === 'AbortError') throw e
    // sin internet, o el servicio no permite la petición desde el navegador (CORS)
    throw new OffError('No se pudo conectar con Open Food Facts. Revisa tu internet o prueba con el código de barras.')
  }
  if (res.status === 404) return { status: 0 }
  if (res.status >= 500) {
    throw new OffError('Open Food Facts no está disponible ahora (la búsqueda por nombre suele fallar). Prueba más tarde o escanea el código de barras.')
  }
  if (!res.ok) throw new OffError(`Open Food Facts respondió con un error (${res.status}).`)
  try {
    return await res.json()
  } catch {
    throw new OffError('Respuesta inválida de Open Food Facts.')
  }
}

export async function fetchOffProduct(barcode: string, fetchFn: Fetch = fetch, signal?: AbortSignal): Promise<Food | null> {
  return parseOffProductResponse(await getJson(fetchFn, productUrl(barcode), signal))
}

export async function searchOff(query: string, fetchFn: Fetch = fetch, signal?: AbortSignal): Promise<Food[]> {
  if (query.trim().length < 2) return []
  return parseOffSearchResponse(await getJson(fetchFn, searchUrl(query), signal))
}
