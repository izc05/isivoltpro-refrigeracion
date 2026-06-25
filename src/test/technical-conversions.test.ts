import { describe, expect, it } from 'vitest'
import { convertAirflow, convertCoolingPower, convertLength, convertMass, convertTemperature, eerFromCop, singlePhaseCurrent, threePhaseCurrent } from '../domain/technical-conversions'
import { paAbsoluteToVacuum, vacuumToPaAbsolute } from '../domain/units'

describe('technical conversions', () => {
  it('converts cooling power examples', () => {
    expect(convertCoolingPower(3000, 'frig_h', 'kW')).toBeCloseTo(3.49, 2)
    expect(convertCoolingPower(12000, 'BTU_h', 'kW')).toBeCloseTo(3.52, 2)
  })

  it('converts mass, length, temperature and airflow', () => {
    expect(convertMass(1, 'kg', 'g')).toBeCloseTo(1000)
    expect(convertLength(10, 'm', 'ft')).toBeCloseTo(32.8084, 3)
    expect(convertTemperature(25, 'C', 'F')).toBeCloseTo(77)
    expect(convertAirflow(500, 'm3_h', 'CFM')).toBeCloseTo(294.29, 1)
  })

  it('converts vacuum through absolute pressure', () => {
    const pa = vacuumToPaAbsolute(500, 'micron')
    expect(paAbsoluteToVacuum(pa, 'mbar_abs')).toBeCloseTo(0.6666, 3)
    expect(paAbsoluteToVacuum(pa, 'Pa_abs')).toBeCloseTo(66.66, 1)
  })

  it('calculates orientative electrical values', () => {
    expect(singlePhaseCurrent(3.5, 230, 0.85)).toBeCloseTo(17.9, 1)
    expect(threePhaseCurrent(3.5, 400, 0.85)).toBeCloseTo(5.94, 1)
    expect(eerFromCop(3.2)).toBeCloseTo(10.92, 2)
  })
})
