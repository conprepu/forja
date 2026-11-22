import { describe, expect, it } from 'vitest'
import { addDays, addMonthsAnchored, diffDays, formatRelative, startOfWeek, toISODate, weekday } from './dates'

describe('dates', () => {
  it('toISODate usa la fecha local, no UTC', () => {
    expect(toISODate(new Date(2026, 0, 1, 23, 59))).toBe('2026-01-01')
  })
  it('addDays cruza meses y años', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
  })
  it('addMonthsAnchored recorta a fin de mes y recupera el día ancla', () => {
    expect(addMonthsAnchored('2026-01-31', 1, 31)).toBe('2026-02-28')
    expect(addMonthsAnchored('2026-02-28', 1, 31)).toBe('2026-03-31')
    expect(addMonthsAnchored('2028-01-30', 1, 30)).toBe('2028-02-29')
    expect(addMonthsAnchored('2026-12-15', 1, 15)).toBe('2027-01-15')
  })
  it('weekday y startOfWeek (lunes)', () => {
    expect(weekday('2026-11-22')).toBe(0) // domingo
    expect(startOfWeek('2026-11-22')).toBe('2026-11-16')
    expect(startOfWeek('2026-11-16')).toBe('2026-11-16')
  })
  it('diffDays', () => {
    expect(diffDays('2026-11-20', '2026-11-22')).toBe(2)
    expect(diffDays('2026-03-28', '2026-03-30')).toBe(2)
  })
  it('formatRelative', () => {
    expect(formatRelative('2026-11-22', '2026-11-22')).toBe('Hoy')
    expect(formatRelative('2026-11-23', '2026-11-22')).toBe('Mañana')
    expect(formatRelative('2026-11-21', '2026-11-22')).toBe('Ayer')
  })
})
