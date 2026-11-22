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
