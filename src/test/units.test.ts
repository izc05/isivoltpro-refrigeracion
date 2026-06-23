import { describe, expect, it } from 'vitest'
import { convertPressure, paAbsoluteToPressure, pressureToPaAbsolute, vacuumToPaAbsolute, paAbsoluteToVacuum } from '../domain/units'

describe('unit conversions', () => {
  it('converts Pa, bar and PSI', () => {
    expect(convertPressure(1, 'bar', 'Pa')).toBeCloseTo(100000)
    expect(convertPressure(14.5037738, 'PSI', 'bar')).toBeCloseTo(1, 5)
  })
  it('handles absolute and gauge pressure', () => {
    expect(pressureToPaAbsolute(1, 'bar', 'gauge', 100000)).toBe(200000)
    expect(paAbsoluteToPressure(200000, 'bar', 'gauge', 100000)).toBe(1)
  })
  it('converts vacuum through absolute pressure', () => {
    const pa = vacuumToPaAbsolute(500, 'micron')
    expect(pa).toBeCloseTo(66.661, 3)
    expect(paAbsoluteToVacuum(pa, 'Torr')).toBeCloseTo(0.5, 3)
  })
})
