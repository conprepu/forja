import { describe, expect, it } from 'vitest'
import { detectPrs, computeBests, mergeBests } from '../../src/lib/prs'

const s = (weight: number, reps: number, type: 'normal' | 'warmup' | 'drop' | 'failure' = 'normal', done = true) => ({ type, weight, reps, done })

describe('computeBests', () => {
  it('peso máximo, 1RM Epley y volumen total', () => {
    const b = computeBests('weight_reps', [s(100, 5), s(90, 8), s(80, 10)])
    expect(b.weight).toBe(100)
    expect(b.e1rm).toBeCloseTo(Math.max(100 * (1 + 5 / 30), 90 * (1 + 8 / 30), 80 * (1 + 10 / 30)), 6)
    expect(b.volume).toBe(500 + 720 + 800)
    expect(b.reps).toBeUndefined()
  })
  it('ignora calentamientos y series sin hacer', () => {
    const b = computeBests('weight_reps', [s(140, 1, 'warmup'), s(200, 5, 'normal', false), s(100, 5)])
    expect(b.weight).toBe(100)
    expect(b.volume).toBe(500)
  })
  it('drop sets y series al fallo sí cuentan', () => {
    expect(computeBests('weight_reps', [s(60, 10, 'drop')]).weight).toBe(60)
    expect(computeBests('weight_reps', [s(80, 7, 'failure')]).weight).toBe(80)
  })
  it('1 repetición: el 1RM es el peso', () => {
    expect(computeBests('weight_reps', [s(150, 1)]).e1rm).toBe(150)
  })
  it('peso corporal sin lastre: solo repeticiones', () => {
    expect(computeBests('weight_reps', [s(0, 12), s(0, 15)])).toEqual({ reps: 15 })
  })
  it('con lastre se trata como carga', () => {
    expect(computeBests('weight_reps', [s(20, 8)]).weight).toBe(20)
  })
  it('tiempo: la serie más larga; distancia: nada', () => {
    expect(computeBests('time', [s(0, 45), s(0, 60)])).toEqual({ reps: 60 })
    expect(computeBests('distance', [s(5, 30)])).toEqual({})
  })
  it('sin series válidas no hay marcas', () => {
    expect(computeBests('weight_reps', [])).toEqual({})
    expect(computeBests('weight_reps', [s(100, 0)])).toEqual({})
  })
})

describe('mergeBests', () => {
  it('toma el máximo por marca', () => {
    expect(mergeBests({ weight: 100, volume: 500 }, { weight: 90, volume: 800, e1rm: 120 })).toEqual({ weight: 100, volume: 800, e1rm: 120 })
  })
})

describe('detectPrs', () => {
  it('marca solo lo que se superó', () => {
    expect(detectPrs({ weight: 100, e1rm: 110, volume: 1000 }, { weight: 100, e1rm: 112, volume: 900 })).toEqual(['e1rm'])
  })
  it('empatar no es récord', () => {
    expect(detectPrs({ weight: 100 }, { weight: 100 })).toEqual([])
  })
  it('la primera vez no cuenta', () => {
    expect(detectPrs(null, { weight: 100, e1rm: 110 })).toEqual([])
  })
  it('una marca que no existía antes no se premia', () => {
    expect(detectPrs({ reps: 10 }, { weight: 20, reps: 12 })).toEqual(['reps'])
  })
  it('tolera ruido de punto flotante', () => {
    expect(detectPrs({ e1rm: 116.66666666666667 }, { e1rm: 100 * (1 + 5 / 30) })).toEqual([])
  })
})
