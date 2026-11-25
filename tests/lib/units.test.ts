import { describe, expect, it } from 'vitest'
import { fmtWeight, fromKg, KG_PER_LB, toKg } from '../../src/lib/units'

describe('kg y lb', () => {
  it('en kg no cambia nada', () => {
    expect(fromKg(62.5, 'kg')).toBe(62.5)
    expect(toKg(62.5, 'kg')).toBe(62.5)
  })

  it('escribir libras y volver a verlas da lo mismo', () => {
    for (const lb of [5, 10, 22.5, 45, 100, 135, 182.5, 225, 315]) expect(fromKg(toKg(lb, 'lb'), 'lb')).toBe(lb)
  })

  it('convierte con el factor exacto', () => {
    expect(toKg(100, 'lb')).toBeCloseTo(45.359237, 6)
    expect(fromKg(100, 'lb')).toBe(220.46)
    expect(KG_PER_LB * 2.2046226218).toBeCloseTo(1, 6)
  })

  it('texto con su unidad', () => {
    expect(fmtWeight(toKg(135, 'lb'), 'lb')).toBe('135 lb')
    expect(fmtWeight(61.24, 'kg')).toBe('61.2 kg')
  })
})
