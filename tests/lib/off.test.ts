import { describe, expect, it, vi } from 'vitest'
import { cacheOffFood, findByBarcode, lookupBarcode } from '../../src/db/off'
import { deleteRecipe, saveRecipe } from '../../src/db/recipes'
import {
  fetchOffProduct,
  OffError,
  parseOffProduct,
  parseOffProductResponse,
  parseOffSearchResponse,
  normalizeProxyUrl,
  productUrl,
  proxySearchUrl,
  searchOff,
} from '../../src/lib/off'
import { freshDb } from '../db/helpers'

const nutella = {
  code: '3017620422003',
  product_name: 'Nutella',
  brands: 'Ferrero, Nutella',
  serving_size: '15 g',
  serving_quantity: 15,
  nutriments: { 'energy-kcal_100g': 539, proteins_100g: 6.3, carbohydrates_100g: 57.5, fat_100g: 30.9, fiber_100g: 0, energy_100g: 2252 },
}

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body })

describe('parseOffProduct', () => {
  it('convierte un producto completo', () => {
    expect(parseOffProduct(nutella)).toEqual({
      id: 'off-3017620422003',
      name: 'Nutella',
      brand: 'Ferrero',
      barcode: '3017620422003',
      per100: { kcal: 539, p: 6.3, c: 57.5, f: 30.9, fiber: 0 },
      servings: [{ label: '15 g', grams: 15 }],
      source: 'off',
    })
  })
  it('acepta números como texto y con coma', () => {
    const f = parseOffProduct({ code: '1', product_name: 'X', nutriments: { 'energy-kcal_100g': '250', proteins_100g: '10,5', carbohydrates_100g: '30', fat_100g: '5' } })
    expect(f?.per100).toEqual({ kcal: 250, p: 10.5, c: 30, f: 5 })
  })
  it('si solo hay kJ los pasa a kcal', () => {
    expect(parseOffProduct({ code: '1', nutriments: { energy_100g: 1000, proteins_100g: 1 } })?.per100.kcal).toBe(239)
  })
  it('si no hay energía la calcula con los macros (Atwater)', () => {
    expect(parseOffProduct({ code: '1', nutriments: { proteins_100g: 10, carbohydrates_100g: 20, fat_100g: 5 } })?.per100.kcal).toBe(165)
  })
  it('sin información nutrimental no sirve', () => {
    expect(parseOffProduct({ code: '1', product_name: 'X', nutriments: {} })).toBeNull()
    expect(parseOffProduct({ code: '1', product_name: 'X' })).toBeNull()
    expect(parseOffProduct({ product_name: 'X', nutriments: { 'energy-kcal_100g': 1 } })).toBeNull()
    expect(parseOffProduct(null)).toBeNull()
    expect(parseOffProduct('x')).toBeNull()
  })
  it('nombre alterno, sin nombre y sin porción', () => {
    expect(parseOffProduct({ code: '1', generic_name: ' Galletas ', nutriments: { 'energy-kcal_100g': 400 } })?.name).toBe('Galletas')
    const f = parseOffProduct({ code: '1', product_name: '  ', nutriments: { 'energy-kcal_100g': 400 } })!
    expect(f.name).toBe('Producto sin nombre')
    expect(f.servings).toEqual([])
    expect(f).not.toHaveProperty('brand')
  })
  it('porción sin texto usa los gramos', () => {
    expect(parseOffProduct({ code: '1', serving_quantity: '30', nutriments: { 'energy-kcal_100g': 400 } })?.servings).toEqual([{ label: '30 g', grams: 30 }])
  })
  it('ignora valores negativos o basura', () => {
    const f = parseOffProduct({ code: '1', nutriments: { 'energy-kcal_100g': 100, proteins_100g: -5, fat_100g: 'abc' } })
    expect(f?.per100).toEqual({ kcal: 100, p: 0, c: 0, f: 0 })
  })
})

describe('respuestas de la API', () => {
  it('producto encontrado y no encontrado', () => {
    expect(parseOffProductResponse({ status: 1, code: '3017620422003', product: { product_name: 'Nutella', nutriments: nutella.nutriments } })?.id).toBe('off-3017620422003')
    expect(parseOffProductResponse({ status: 0, code: '0', status_verbose: 'product not found' })).toBeNull()
    expect(parseOffProductResponse(null)).toBeNull()
    expect(parseOffProductResponse({ status: 1, code: '1' })).toBeNull()
  })
  it('búsqueda: quita productos sin datos y repetidos', () => {
    const r = parseOffSearchResponse({ products: [nutella, { code: '2', product_name: 'Sin datos' }, nutella, null, { ...nutella, code: '5' }] })
    expect(r.map((f) => f.id)).toEqual(['off-3017620422003', 'off-5'])
    expect(parseOffSearchResponse({})).toEqual([])
    expect(parseOffSearchResponse(null)).toEqual([])
  })
  it('el proxy responde con hits y la marca puede venir como lista', () => {
    const r = parseOffSearchResponse({ hits: [{ code: '7', product_name: 'Pozole Rojo', brands: ['Del Fuerte', 'X'], nutriments: { 'energy-kj_100g': 418, proteins_100g: 4 } }] })
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ id: 'off-7', name: 'Pozole Rojo', brand: 'Del Fuerte' })
    expect(r[0]?.per100.kcal).toBe(100)
  })
  it('las URLs codifican lo que escribe el usuario', () => {
    expect(productUrl('301 762')).toContain('/api/v2/product/301%20762.json')
    expect(proxySearchUrl('https://p.workers.dev', 'tortilla & queso')).toBe('https://p.workers.dev/search?q=tortilla%20%26%20queso&limit=25')
  })
  it('normalizeProxyUrl acepta https y localhost, y quita la barra final', () => {
    expect(normalizeProxyUrl(' https://forja.x.workers.dev/ ')).toBe('https://forja.x.workers.dev')
    expect(normalizeProxyUrl('http://localhost:8787')).toBe('http://localhost:8787')
    expect(normalizeProxyUrl('https://a.com/proxy/')).toBe('https://a.com/proxy')
    expect(normalizeProxyUrl('http://a.com')).toBeNull()
    expect(normalizeProxyUrl('no es url')).toBeNull()
    expect(normalizeProxyUrl('')).toBeNull()
  })
})

describe('red', () => {
  it('fetchOffProduct: 404 es "no existe"; otros errores y caídas lanzan OffError', async () => {
    expect(await fetchOffProduct('1', async () => ({ ok: false, status: 404, json: async () => ({}) }))).toBeNull()
    await expect(fetchOffProduct('1', async () => ({ ok: false, status: 503, json: async () => ({}) }))).rejects.toThrow(/no está disponible/)
    await expect(fetchOffProduct('1', async () => ({ ok: false, status: 429, json: async () => ({}) }))).rejects.toThrow(/\(429\)/)
    await expect(fetchOffProduct('1', async () => { throw new TypeError('Failed to fetch') })).rejects.toThrow(/No se pudo conectar/)
    await expect(fetchOffProduct('1', async () => ({ ok: true, status: 200, json: async () => { throw new Error('x') } }))).rejects.toThrow(/inválida/)
  })
  const PROXY = 'https://forja.test.workers.dev'
  it('una búsqueda cancelada relanza AbortError, no OffError', async () => {
    const abort = async () => { throw new DOMException('abort', 'AbortError') }
    await expect(searchOff('pollo', PROXY, abort)).rejects.toMatchObject({ name: 'AbortError' })
  })
  it('searchOff no consulta con menos de 2 letras', async () => {
    const f = vi.fn()
    expect(await searchOff(' a ', PROXY, f)).toEqual([])
    expect(f).not.toHaveBeenCalled()
  })
  it('sin proxy configurado avisa en vez de intentar', async () => {
    const f = vi.fn()
    await expect(searchOff('pollo', null, f)).rejects.toThrow(/Configura la búsqueda/)
    expect(f).not.toHaveBeenCalled()
  })
  it('searchOff consulta el proxy y devuelve alimentos', async () => {
    const f = vi.fn(async (_u: string) => ok({ hits: [nutella] }))
    expect((await searchOff('nutella', PROXY, f)).map((x) => x.name)).toEqual(['Nutella'])
    expect(f.mock.calls[0]![0]).toBe(`${PROXY}/search?q=nutella&limit=25`)
  })
})

describe('lookupBarcode y caché', () => {
  it('busca en OFF, guarda el resultado y la siguiente vez no usa la red', async () => {
    const db = await freshDb()
    const fetchFn = vi.fn(async () => ok({ status: 1, code: nutella.code, product: nutella }))
    const f = await lookupBarcode(db, nutella.code, fetchFn)
    expect(f?.name).toBe('Nutella')
    expect(fetchFn).toHaveBeenCalledTimes(1)
    expect((await findByBarcode(db, nutella.code))?.source).toBe('off')
    await lookupBarcode(db, nutella.code, fetchFn)
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })
  it('funciona sin internet si ya estaba guardado', async () => {
    const db = await freshDb()
    await cacheOffFood(db, parseOffProduct(nutella)!)
    const offline = async () => { throw new TypeError('offline') }
    expect((await lookupBarcode(db, nutella.code, offline))?.id).toBe(`off-${nutella.code}`)
  })
  it('producto inexistente: null y no se guarda nada', async () => {
    const db = await freshDb()
    const before = await db.foods.count()
    expect(await lookupBarcode(db, '999', async () => ok({ status: 0 }))).toBeNull()
    expect(await db.foods.count()).toBe(before)
  })
  it('un fallo de red se propaga para que la UI lo avise', async () => {
    const db = await freshDb()
    await expect(lookupBarcode(db, '123', async () => { throw new TypeError('offline') })).rejects.toThrow(OffError)
  })
  it('limpia el código (espacios, guiones) y rechaza vacíos', async () => {
    const db = await freshDb()
    const fetchFn = vi.fn(async (_url: string) => ok({ status: 1, code: '301', product: { ...nutella, code: '301' } }))
    await lookupBarcode(db, ' 301-', fetchFn)
    expect(fetchFn.mock.calls[0]?.[0]).toContain('/product/301.json')
    expect(await lookupBarcode(db, 'abc', fetchFn)).toBeNull()
    expect(fetchFn).toHaveBeenCalledTimes(1)
  })
  it('un alimento propio con el mismo código gana sobre el de OFF', async () => {
    const db = await freshDb()
    await db.foods.put({ id: `off-${nutella.code}`, name: 'Mi Nutella', per100: { kcal: 1, p: 1, c: 1, f: 1 }, servings: [], source: 'custom', barcode: nutella.code })
    await cacheOffFood(db, parseOffProduct(nutella)!)
    expect((await db.foods.get(`off-${nutella.code}`))?.name).toBe('Mi Nutella')
  })
})

describe('recetas', () => {
  it('guarda con valores seguros y quita ingredientes en 0', async () => {
    const db = await freshDb()
    const r = await saveRecipe(db, { name: ' ', servings: 0, ingredients: [{ foodId: 'b0', grams: 200 }, { foodId: 'b1', grams: 0 }] })
    expect(r).toMatchObject({ name: 'Mi receta', servings: 1, ingredients: [{ foodId: 'b0', grams: 200 }] })
    expect(await db.recipes.get(r.id)).toEqual(r)
    await saveRecipe(db, { id: r.id, name: 'Bowl', servings: 3, ingredients: r.ingredients })
    expect(await db.recipes.count()).toBe(1)
    expect((await db.recipes.get(r.id))?.servings).toBe(3)
    await deleteRecipe(db, r.id)
    expect(await db.recipes.count()).toBe(0)
  })
})
