import { describe, expect, it } from 'vitest'
import type { RefrigerantTable } from '../data/generated/refrigerants'
import { calculateSubcooling, calculateSuperheat, evaluateSubcooling, evaluateSuperheat, interpolatePressureFromTemperature, interpolateTemperatureFromPressure } from '../domain/refrigerants/calculations'

const fixture: RefrigerantTable = {
  schemaVersion: 1,
  generatedAt: 'test-fixture',
  generator: 'CoolProp',
  coolPropVersion: 'fixture',
  refrigerant: 'R407C',
  refrigerantType: 'zeotropic',
  validRange: { minC: 0, maxC: 20, minPressurePaAbs: 100000, maxPressurePaAbs: 300000 },
  limitations: ['Synthetic monotonic fixture for interpolation tests only.'],
  points: [
    { pressurePaAbs: 100000, bubbleC: 0, dewC: 3, source: 'test' },
    { pressurePaAbs: 200000, bubbleC: 10, dewC: 14, source: 'test' },
    { pressurePaAbs: 300000, bubbleC: 20, dewC: 25, source: 'test' },
  ],
}

describe('refrigerant interpolation and calculations', () => {
  it('interpolates dew and bubble separately', () => {
    expect(interpolateTemperatureFromPressure(fixture, 150000, 'bubble')).toBeCloseTo(5)
    expect(interpolateTemperatureFromPressure(fixture, 150000, 'dew')).toBeCloseTo(8.5)
  })
  it('interpolates pressure from temperature', () => {
    expect(interpolatePressureFromTemperature(fixture, 15, 'bubble')).toBeCloseTo(250000)
  })
  it('calculates superheat and subcooling', () => {
    expect(calculateSuperheat(200000, 20, fixture)).toBeCloseTo(6)
    expect(calculateSubcooling(200000, 7, fixture)).toBeCloseTo(3)
  })
  it('rejects values outside the generated range', () => {
    expect(() => interpolateTemperatureFromPressure(fixture, 1, 'dew')).toThrow(RangeError)
  })
  it('classifies orientative field indicators', () => {
    expect(evaluateSuperheat(16).label).toBe('Elevado')
    expect(evaluateSuperheat(7).label).toBe('Normal')
    expect(evaluateSubcooling(1).label).toBe('Bajo')
  })
})
