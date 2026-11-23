import { fetchOffProduct } from '../lib/off'
import type { ForjaDB } from './db'
import type { Food } from './schema'

/** Guarda en la base un alimento traído de Open Food Facts (no pisa uno propio con el mismo id). */
export async function cacheOffFood(db: ForjaDB, food: Food): Promise<Food> {
  const existing = await db.foods.get(food.id)
  if (existing && existing.source === 'custom') return existing
  await db.foods.put(food)
  return food
}

const PROXY_KEY = 'offProxy'

/** Proxy de Open Food Facts ya desplegado (worker/): la app viene con la búsqueda en internet lista. */
export const DEFAULT_OFF_PROXY = 'https://forja-off-proxy.woduqusia.workers.dev'

/**
 * URL del proxy de búsqueda por nombre. Sin nada guardado se usa el de fábrica;
 * si la quitaste en Perfil (se guarda vacía) la búsqueda en internet queda apagada.
 */
export async function getOffProxy(db: ForjaDB): Promise<string | null> {
  const row = await db.settings.get(PROXY_KEY)
  if (!row) return DEFAULT_OFF_PROXY
  return typeof row.value === 'string' && row.value ? row.value : null
}

export const setOffProxy = (db: ForjaDB, url: string | null) => db.settings.put({ key: PROXY_KEY, value: url ?? '' })

export const findByBarcode = (db: ForjaDB, barcode: string) => db.foods.where('barcode').equals(barcode).first()

/**
 * Busca un código de barras: primero en la base local (funciona sin internet) y, si no está,
 * en Open Food Facts, guardando el resultado. null = no existe. Lanza OffError si falla la red.
 */
export async function lookupBarcode(db: ForjaDB, barcode: string, fetchFn?: Parameters<typeof fetchOffProduct>[1]): Promise<Food | null> {
  const code = barcode.replace(/\D/g, '')
  if (!code) return null
  const local = await findByBarcode(db, code)
  if (local) return local
  const remote = await fetchOffProduct(code, fetchFn)
  return remote ? cacheOffFood(db, remote) : null
}
