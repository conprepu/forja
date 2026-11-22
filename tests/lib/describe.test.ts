import { describe, expect, it } from 'vitest'
import type { Food } from '../../src/db/schema'
import { seedFoods } from '../../src/db/seed'
import { describeMeal, parseChunk, rankWebResults, relevantTo, resolveGrams, splitDescription, stem, withFood } from '../../src/lib/describe'

const foods: Food[] = seedFoods.map((f) => ({ ...f, source: 'local' as const }))
const run = (t: string, recent: string[] = []) => describeMeal(t, foods, recent)
const one = (t: string) => run(t)[0]!
const find = (name: string) => foods.find((f) => f.name === name)!

describe('splitDescription', () => {
  it('separa por comas, "y", "con", saltos de línea y +', () => {
    expect(splitDescription('2 huevos con 3 tortillas y un vaso de leche')).toEqual(['2 huevos', '3 tortillas', 'un vaso de leche'])
    expect(splitDescription('arroz, frijoles; pollo\nensalada + agua')).toEqual(['arroz', 'frijoles', 'pollo', 'ensalada', 'agua'])
  })
  it('no parte los decimales con coma ni pega números con letras', () => {
    expect(splitDescription('1,5 tazas de arroz')).toEqual(['1.5 tazas de arroz'])
    expect(splitDescription('150g de pollo')).toEqual(['150 g de pollo'])
  })
  it('ignora acentos y mayúsculas', () => {
    expect(splitDescription('PLÁTANO y Piña')).toEqual(['platano', 'pina'])
  })
  it('vacío', () => expect(splitDescription('  ')).toEqual([]))
})

describe('parseChunk', () => {
  it('cantidad y unidad', () => {
    expect(parseChunk('150 g de pechuga de pollo')).toEqual({ qty: 150, unit: 'g', query: ['pechuga', 'pollo'] })
    expect(parseChunk('media taza de arroz')).toEqual({ qty: 0.5, unit: 'taza', query: ['arroz'] })
    expect(parseChunk('1/2 taza de frijoles')).toMatchObject({ qty: 0.5, unit: 'taza', query: ['frijol'] })
    expect(parseChunk('2 cucharadas de crema de cacahuate')).toEqual({ qty: 2, unit: 'cda', query: ['crema', 'cacahuate'] })
  })
  it('cantidad sin unidad y cantidad al final', () => {
    expect(parseChunk('3 tortillas')).toEqual({ qty: 3, unit: null, query: ['tortilla'] })
    expect(parseChunk('pollo 200 g')).toEqual({ qty: 200, unit: 'g', query: ['pollo'] })
  })
  it('sin cantidad', () => {
    expect(parseChunk('arroz')).toEqual({ qty: null, unit: null, query: ['arroz'] })
  })
  it('una unidad sin número cuenta como 1', () => {
    expect(parseChunk('lata de atun')).toEqual({ qty: 1, unit: 'lata', query: ['atun'] })
  })
  it('un par = 2', () => {
    expect(parseChunk('un par de huevos')).toEqual({ qty: 2, unit: null, query: ['huevo'] })
  })
  it('quita muletillas', () => {
    expect(parseChunk('me comi un poco de arroz').query).toEqual(['arroz'])
  })
})

describe('stem', () => {
  it('singulariza', () => {
    expect(['huevos', 'tortillas', 'frijoles', 'limones', 'panes', 'arroz', 'gas', 'papas'].map(stem)).toEqual(['huevo', 'tortilla', 'frijol', 'limon', 'pan', 'arroz', 'gas', 'papa'])
  })
})

describe('resolveGrams', () => {
  const huevo = find('Huevo entero') // 1 huevo = 50 g
  const arroz = find('Arroz blanco cocido') // 1 taza = 150 g
  const frijoles = find('Frijoles refritos') // ½ taza = 120 g
  it('peso dicho', () => {
    expect(resolveGrams(arroz, 200, 'g')).toEqual({ grams: 200, basis: 'peso' })
    expect(resolveGrams(arroz, 0.5, 'kg')).toEqual({ grams: 500, basis: 'peso' })
    expect(resolveGrams(arroz, 250, 'ml')).toEqual({ grams: 250, basis: 'peso' })
  })
  it('porción natural del alimento', () => {
    expect(resolveGrams(huevo, 3, null)).toEqual({ grams: 150, basis: 'porcion' })
    expect(resolveGrams(huevo, null, null)).toEqual({ grams: 50, basis: 'porcion' })
  })
  it('tazas usan la porción en taza del alimento', () => {
    expect(resolveGrams(arroz, 2, 'taza')).toEqual({ grams: 300, basis: 'porcion' })
    expect(resolveGrams(frijoles, 1, 'taza')).toEqual({ grams: 240, basis: 'porcion' }) // "½ taza" = 120 g
  })
  it('sin porción en esa unidad, un valor aproximado marcado como estimado', () => {
    expect(resolveGrams(huevo, 1, 'taza')).toEqual({ grams: 240, basis: 'estimado' })
    expect(resolveGrams(huevo, 2, 'cda')).toEqual({ grams: 30, basis: 'estimado' })
  })
  it('un número grande sin unidad son gramos', () => {
    expect(resolveGrams(arroz, 200, null)).toEqual({ grams: 200, basis: 'peso' })
  })
  it('alimento sin porción: 100 g por unidad, estimado', () => {
    const raro: Food = { id: 'x', name: 'X', per100: { kcal: 1, p: 1, c: 1, f: 1 }, servings: [], source: 'custom' }
    expect(resolveGrams(raro, 2, null)).toEqual({ grams: 200, basis: 'estimado' })
  })
})

describe('describeMeal', () => {
  it('el ejemplo de la descripción completa', () => {
    const r = run('2 huevos con 3 tortillas y un vaso de leche')
    expect(r.map((i) => [i.food?.name, i.grams])).toEqual([['Huevo entero', 100], ['Tortilla de maíz', 90], ['Leche entera', 240]])
  })
  it('peso explícito y plural', () => {
    expect(one('150 g de pechuga de pollo')).toMatchObject({ grams: 150, basis: 'peso', food: { name: 'Pechuga de pollo cocida' } })
    expect(one('200g de frijoles negros').food?.name).toBe('Frijoles negros cocidos')
  })
  it('elige el alimento más probable cuando es ambiguo', () => {
    expect(one('pollo').food?.name).toBe('Pechuga de pollo cocida')
    expect(one('huevo').food?.name).toBe('Huevo entero')
    expect(one('arroz').food?.name).toBe('Arroz blanco cocido')
    expect(one('una coca').food?.name).toBe('Refresco de cola')
  })
  it('adjetivos que no están en el nombre no estorban', () => {
    expect(one('2 huevos revueltos').food?.name).toBe('Huevo entero')
    expect(one('pollo a la plancha').food?.name).toBe('Pechuga de pollo cocida')
  })
  it('especifica el tipo cuando lo dicen', () => {
    expect(one('muslo de pollo').food?.name).toBe('Muslo de pollo cocido')
    expect(one('clara de huevo').food?.name).toBe('Clara de huevo')
    expect(one('leche descremada').food?.name).toBe('Leche descremada')
  })
  it('lo que no existe queda sin alimento y sin gramos', () => {
    const r = one('sushi')
    expect(r.food).toBeNull()
    expect(r.grams).toBe(0)
    expect(r.query).toBe('sushi')
  })
  it('mezcla lo encontrado con lo no encontrado', () => {
    const r = run('un plátano, sushi y 2 tacos al pastor')
    expect(r.map((i) => i.food?.name ?? null)).toEqual(['Plátano', null, 'Taco al pastor'])
    expect(r[2]!.grams).toBe(160)
  })
  it('lo reciente desempata', () => {
    const a = foods.find((f) => f.name === 'Queso Oaxaca')!
    expect(run('queso', [a.id])[0]?.food?.name).toBe('Queso panela') // el preferido gana a un simple reciente
    expect(run('queso oaxaca')[0]?.food?.name).toBe('Queso Oaxaca')
  })
  it('un alimento propio gana a uno igual del catálogo', () => {
    const mio: Food = { id: 'c1', name: 'Pollo de mi mamá', per100: { kcal: 150, p: 25, c: 0, f: 5 }, servings: [{ label: '1 plato', grams: 200 }], source: 'custom' }
    const r = describeMeal('pollo de mi mama', [...foods, mio])
    expect(r[0]?.food?.id).toBe('c1')
  })
  it('frases con acentos y mayúsculas', () => {
    expect(run('Media TAZA de Avena').map((i) => [i.food?.name, i.grams])).toEqual([['Avena en hojuelas', 40]])
  })
  it('vacío o solo muletillas', () => {
    expect(run('')).toEqual([])
    expect(run('me comí')).toEqual([])
  })
})

describe('relevantTo (filtrar resultados de internet)', () => {
  const f = (name: string, brand?: string): Food => ({ id: 'x', name, ...(brand ? { brand } : {}), per100: { kcal: 1, p: 1, c: 1, f: 1 }, servings: [], source: 'off' })
  it('al menos una palabra en común, sin acentos ni plurales', () => {
    expect(relevantTo(f('Maíz para pozole Ovarb'), 'pozole')).toBe(true)
    expect(relevantTo(f('Tacos al pastor'), 'taco')).toBe(true)
    expect(relevantTo(f('Nutella'), 'pozole')).toBe(false)
  })
  it('también considera la marca', () => {
    expect(relevantTo(f('Sopa', 'Sushi Daily'), 'sushi')).toBe(true)
  })
})

describe('rankWebResults', () => {
  const f = (id: string, name: string): Food => ({ id, name, per100: { kcal: 1, p: 1, c: 1, f: 1 }, servings: [], source: 'off' })
  it('descarta lo irrelevante y pone primero el nombre más parecido', () => {
    const r = rankWebResults([f('a', 'Arroz para sushi Vitasia'), f('b', 'Nutella'), f('c', 'Sushi'), f('d', 'Maki de pepino')], 'sushi')
    expect(r.map((x) => x.id)).toEqual(['c', 'a'])
  })
  it('sin resultados relevantes queda vacío', () => {
    expect(rankWebResults([f('b', 'Nutella')], 'pozole')).toEqual([])
  })
})

describe('withFood', () => {
  it('al cambiar el alimento conserva cantidad y unidad', () => {
    const r = one('2 tazas de arroz')
    const integral = find('Arroz integral cocido')
    expect(withFood(r, integral)).toMatchObject({ food: { name: 'Arroz integral cocido' }, grams: 300, basis: 'porcion' })
  })
  it('sirve también para llenar un renglón sin alimento', () => {
    const r = withFood(one('3 sushi'), find('Aguacate'))
    expect(r.food?.name).toBe('Aguacate')
    expect(r.grams).toBe(3 * 150) // 1 aguacate = ½ aguacate (75 g) → 150 g por unidad
  })
})
