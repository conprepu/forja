import { describe, expect, it } from 'vitest'
import { epley } from '../../src/lib/1rm'
import { platesPerSide, warmupSets } from '../../src/lib/plates'
import { parseDecimal } from '../../src/lib/units'
import { fmtT } from '../../src/lib/time'

describe('epley', () => {
  it('kg × (1 + reps/30)', () => {
    expect(epley(100, 5)).toBeCloseTo(116.667, 3)
    expect(epley(80, 10)).toBeCloseTo(106.667, 3)
  })
  it('una repetición es el peso mismo; entradas inválidas dan 0', () => {
    expect(epley(140, 1)).toBe(140)
    expect(epley(0, 5)).toBe(0)
    expect(epley(100, 0)).toBe(0)
  })
})

describe('platesPerSide', () => {
  it('60 kg con barra de 20: 20 por lado', () => {
    expect(platesPerSide(60)).toEqual({ perSide: 20, plates: [20], leftover: 0 })
  })
  it('100 kg: 40 por lado = 25 + 15', () => {
    expect(platesPerSide(100).plates).toEqual([25, 15])
  })
  it('usa discos chicos sin errores de punto flotante', () => {
    expect(platesPerSide(52.5)).toEqual({ perSide: 16.25, plates: [15, 1.25], leftover: 0 })
    expect(platesPerSide(42.5).plates).toEqual([10, 1.25])
  })
  it('solo la barra o menos que la barra', () => {
    expect(platesPerSide(20).plates).toEqual([])
    expect(platesPerSide(10)).toEqual({ perSide: 0, plates: [], leftover: 0 })
  })
  it('avisa lo que sobra cuando no se puede cargar', () => {
    const r = platesPerSide(21)
    expect(r.plates).toEqual([])
    expect(r.leftover).toBe(0.5)
  })
  it('respeta otra barra y otros discos', () => {
    expect(platesPerSide(45, 15).plates).toEqual([15])
    expect(platesPerSide(60, 20, [20, 10]).plates).toEqual([20])
  })
})

describe('warmupSets', () => {
  it('100 kg: barra, 40, 60, 75 y 90 %', () => {
    expect(warmupSets(100)).toEqual([
      { kg: 20, reps: 10 },
      { kg: 40, reps: 8 },
      { kg: 60, reps: 5 },
      { kg: 75, reps: 3 },
      { kg: 90, reps: 1 },
    ])
  })
  it('redondea a 2.5 kg', () => {
    expect(warmupSets(82.5).map((s) => s.kg)).toEqual([20, 32.5, 50, 62.5, 75])
  })
  it('pesos chicos: sin escalones que no superen a la barra', () => {
    // 40 % = 15 kg y 60 % = 25… el de 15 no supera la barra y se omite
    expect(warmupSets(40)).toEqual([{ kg: 25, reps: 5 }, { kg: 30, reps: 3 }, { kg: 35, reps: 1 }])
    expect(warmupSets(20)).toEqual([])
    expect(warmupSets(0)).toEqual([])
  })
  it('siempre ascendente y por debajo del peso de trabajo', () => {
    for (const w of [25, 45, 60, 87.5, 140, 200]) {
      const kgs = warmupSets(w).map((s) => s.kg)
      expect([...kgs].sort((a, b) => a - b)).toEqual(kgs)
      expect(new Set(kgs).size).toBe(kgs.length)
      for (const kg of kgs) expect(kg).toBeLessThan(w)
    }
  })
})

describe('units y tiempo', () => {
  it('parseDecimal acepta coma y punto', () => {
    expect(parseDecimal('82,5')).toBe(82.5)
    expect(parseDecimal('82.5')).toBe(82.5)
    expect(parseDecimal(' 100 ')).toBe(100)
    expect(parseDecimal('')).toBeNull()
    expect(parseDecimal('abc')).toBeNull()
    expect(parseDecimal('-3')).toBeNull()
    expect(parseDecimal('82.')).toBe(82)
  })
  it('fmtT', () => {
    expect(fmtT(0)).toBe('0:00')
    expect(fmtT(75)).toBe('1:15')
    expect(fmtT(3725)).toBe('1:02:05')
    expect(fmtT(-5)).toBe('0:00')
  })
})
