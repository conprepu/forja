import { describe, expect, it } from 'vitest'
import type { Food } from '../../src/db/schema'
import { seedFoods } from '../../src/db/seed'
import { describeMeal, type DescribedItem } from '../../src/lib/describe'
import { DISHES } from '../../src/lib/dishes'
import { macrosFor, sumMacros } from '../../src/lib/nutrition'
import { sameToken } from '../../src/lib/tokens'

const foods: Food[] = seedFoods.map((f) => ({ ...f, source: 'local' as const }))
const run = (t: string) => describeMeal(t, foods)
const names = (rows: DescribedItem[]) => rows.map((r) => r.food?.name)
const grams = (rows: DescribedItem[], name: string) => rows.filter((r) => r.food?.name === name).reduce((s, r) => s + r.grams, 0)
const kcal = (rows: DescribedItem[]) => sumMacros(rows.filter((r) => r.food).map((r) => macrosFor(r.food!.per100, r.grams))).kcal
const groups = (rows: DescribedItem[]) => [...new Set(rows.filter((r) => r.group).map((r) => r.group))]

describe('base de alimentos', () => {
  it('nombres únicos, porciones y macros coherentes', () => {
    expect(new Set(seedFoods.map((f) => f.name)).size).toBe(seedFoods.length)
    expect(seedFoods.length).toBeGreaterThan(300)
    for (const f of seedFoods) {
      expect(f.servings.length, f.name).toBeGreaterThan(0)
      for (const s of f.servings) expect(s.grams, f.name).toBeGreaterThan(0)
      const calc = f.per100.p * 4 + f.per100.c * 4 + f.per100.f * 9
      // las bebidas alcohólicas y la fibra se salen de la cuenta de 4-4-9
      if (f.per100.kcal > 40 && !/Cerveza|Vino|Tequila|Elote/.test(f.name)) expect(Math.abs(calc - f.per100.kcal) / f.per100.kcal, f.name).toBeLessThan(0.15)
    }
  })
})

describe('platillos armables', () => {
  it('todos los ingredientes existen en la base', () => {
    const byName = new Set(seedFoods.map((f) => f.name))
    for (const d of DISHES) {
      const comps = [...d.base, ...d.variants.flatMap((v) => [...(v.main ?? []), ...(v.add ?? []), ...(v.replace ?? []), ...Object.values(v.swap ?? {})]), ...d.extras.flatMap((e) => e.items)]
      for (const c of comps) {
        expect(byName.has(c.f), `${d.id}: ${c.f}`).toBe(true)
        expect(c.g).toBeGreaterThan(0)
      }
    }
  })

  it('el ejemplo: "hamburguesa de carne ahumada con tocino y jitomate"', () => {
    const rows = run('comí una hamburguesa de carne ahumada con tocino y jitomate')
    expect(groups(rows)).toEqual(['Hamburguesa de carne ahumada con tocino y jitomate'])
    expect(names(rows)).toEqual(['Pan de hamburguesa', 'Carne para hamburguesa cocida', 'Jitomate', 'Lechuga', 'Cebolla', 'Mayonesa', 'Cátsup', 'Tocino frito'])
    expect(grams(rows, 'Jitomate')).toBe(30) // ya venía en la hamburguesa: no se duplica
    expect(grams(rows, 'Tocino frito')).toBe(20)
    expect(kcal(rows)).toBeGreaterThan(550)
    expect(kcal(rows)).toBeLessThan(700)
    expect(rows[0]!.groupNote).toMatch(/res/)
  })

  it('doble, extra y sin', () => {
    const rows = run('hamburguesa doble con queso y tocino sin cebolla')
    expect(grams(rows, 'Carne para hamburguesa cocida')).toBe(200)
    expect(grams(rows, 'Queso amarillo')).toBe(20)
    expect(names(rows)).not.toContain('Cebolla')
    expect(groups(rows)[0]).toBe('Hamburguesa doble con queso y tocino sin cebolla')
    expect(grams(run('hamburguesa con extra queso'), 'Queso amarillo')).toBe(40)
    expect(grams(run('hamburguesa con doble carne'), 'Carne para hamburguesa cocida')).toBe(200)
  })

  it('variantes y erratas', () => {
    expect(names(run('hamburgesa de pollo con pepinillos'))).toEqual(expect.arrayContaining(['Pechuga de pollo cocida', 'Pepinillos']))
    expect(names(run('hamburgesa de pollo'))).not.toContain('Carne para hamburguesa cocida')
  })

  it('cantidad y plural', () => {
    expect(grams(run('2 hamburguesas'), 'Pan de hamburguesa')).toBe(120)
    expect(grams(run('tacos al pastor'), 'Tortilla de maíz')).toBe(90) // "tacos" sin número: 3
    expect(grams(run('un taco al pastor'), 'Tortilla de maíz')).toBe(30)
    expect(grams(run('una orden de tacos de carnitas'), 'Carnitas de cerdo')).toBe(220) // una orden = 4
  })

  it('tacos: variante, tanda siguiente y extras', () => {
    const rows = run('3 tacos de bistec y 2 de pastor con piña, una coca')
    expect(groups(rows)).toEqual(['3 × Taco de bistec', '2 × Taco al pastor con piña'])
    expect(grams(rows, 'Bistec de res cocido')).toBe(150)
    expect(grams(rows, 'Carne al pastor')).toBe(100)
    expect(grams(rows, 'Refresco de cola')).toBe(355)
    expect(rows.filter((r) => !r.group).map((r) => r.food?.name)).toEqual(['Refresco de cola']) // la piña se quedó dentro del pastor
  })

  it('lo que no es ajuste del platillo queda como otra comida', () => {
    const rows = run('hamburguesa con papas y refresco')
    expect(rows.filter((r) => !r.group).map((r) => r.food?.name)).toEqual(['Papas a la francesa', 'Refresco de cola'])
    const huevos = run('hamburguesa y 2 huevos')
    expect(huevos.filter((r) => !r.group).map((r) => r.food?.name)).toEqual(['Huevo entero'])
  })

  it('una cantidad con unidad después de "y" sí es un ajuste', () => {
    const rows = run('café con leche y 2 cucharadas de azúcar')
    expect(rows.every((r) => r.group)).toBe(true)
    expect(grams(rows, 'Azúcar')).toBe(26)
    expect(grams(rows, 'Leche entera')).toBe(100)
  })

  it('licuado: fruta, leche y extras', () => {
    const rows = run('licuado de fresa con avena y proteína')
    expect(names(rows)).toEqual(['Leche entera', 'Fresas', 'Avena en hojuelas', 'Proteína whey'])
    expect(names(run('licuado de plátano con agua'))).toEqual(['Agua', 'Plátano'])
    expect(names(run('licuado de fresa con plátano'))).toEqual(['Leche entera', 'Fresas', 'Plátano'])
  })

  it('torta: variante, "sin" y combinaciones', () => {
    const milanesa = run('una torta de milanesa con aguacate')
    expect(names(milanesa)).toContain('Milanesa de res')
    expect(names(milanesa)).not.toContain('Jamón de cerdo')
    expect(names(run('torta de jamón sin aguacate'))).not.toContain('Aguacate')
    expect(groups(run('torta de jamón sin aguacate'))[0]).toBe('Torta de jamón sin aguacate')
  })

  it('un platillo de un solo ingrediente es un renglón normal', () => {
    const r = run('un taco de canasta')
    expect(r).toHaveLength(1)
    expect(r[0]).toMatchObject({ food: { name: 'Taco de canasta' }, grams: 45 })
    expect(r[0]!.group).toBeUndefined()
  })

  it('ajustes que suman o cambian: "con pollo", "huevo con chorizo", vegetariana, cilantro', () => {
    expect(names(run('tacos con pollo'))).toContain('Pollo desmenuzado') // no dijeron cuál: es la variante
    const torta = run('una torta de huevo con chorizo')
    expect(names(torta)).toEqual(expect.arrayContaining(['Huevo revuelto', 'Chorizo'])) // ya dijeron huevo: el chorizo se suma
    expect(names(run('hamburguesa vegetariana'))).toContain('Garbanzos cocidos')
    expect(names(run('hamburguesa vegetariana'))).not.toContain('Carne para hamburguesa cocida')
    expect(names(run('3 tacos de carne asada con cebolla y cilantro')).filter((n) => n === 'Cilantro')).toHaveLength(1)
    expect(run('3 tacos de bistec con cebolla y cilantro y 1 de pastor').filter((r) => !r.group)).toHaveLength(0)
  })

  it('cantidades habladas: "taza y media", "media pizza", por peso', () => {
    expect(run('una taza y media de arroz')[0]).toMatchObject({ food: { name: 'Arroz blanco cocido' }, grams: 225 })
    expect(run('media pizza de pepperoni')[0]!.grams).toBe(440)
    expect(run('2 rebanadas de pizza hawaiana')[0]!.grams).toBe(214)
    const total = run('200 g de hamburguesa').reduce((s, r) => s + r.grams, 0)
    expect(Math.abs(total - 200)).toBeLessThanOrEqual(3)
  })

  it('el nombre del platillo conserva lo que dijiste', () => {
    expect(groups(run('licuado de mango con leche descremada y proteína'))[0]).toBe('Licuado de mango con leche descremada con proteína')
    expect(groups(run('quesadilla de flor de calabaza'))[0]).toBe('Quesadilla de flor de calabaza')
  })

  it('hot dog completo trae sus ingredientes', () => {
    const rows = run('hot dog completo')
    expect(names(rows)).toEqual(expect.arrayContaining(['Pan de hot dog', 'Salchicha', 'Tocino frito', 'Frijoles refritos']))
    expect(groups(rows)).toEqual(['Hot dog estilo Sonora'])
  })

  it('quesadilla: tortilla de harina y relleno dicho con "con"', () => {
    const rows = run('1 quesadilla de harina con carne')
    expect(names(rows)).toEqual(['Tortilla de harina', 'Queso Oaxaca', 'Arrachera cocida'])
  })

  it('cambiar el alimento de un ingrediente conserva sus gramos', async () => {
    const { withFood } = await import('../../src/lib/describe')
    const rows = run('hamburguesa')
    const lechuga = rows.find((r) => r.food?.name === 'Lechuga')!
    const col = foods.find((f) => f.name === 'Col')!
    expect(withFood(lechuga, col)).toMatchObject({ food: { name: 'Col' }, grams: 10 })
  })
})

describe('sameToken', () => {
  it('igual, una letra de más o una errata en palabras largas', () => {
    expect(sameToken('yogur', 'yogurt')).toBe(true)
    expect(sameToken('hamburgesa', 'hamburguesa')).toBe(true)
    expect(sameToken('agua', 'aguacate')).toBe(false)
    expect(sameToken('papa', 'papaya')).toBe(false)
    expect(sameToken('limon', 'melon')).toBe(false)
  })
})
