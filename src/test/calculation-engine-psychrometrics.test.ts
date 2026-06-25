import { describe, expect, it } from 'vitest'
import { calculatePsychrometricsFromRelHum } from '../calculation-engine/formulas/psychrometrics'

describe('calculation-engine psychrometrics', () => {
  it('calculates moist air properties from dry bulb and relative humidity', () => {
    const result = calculatePsychrometricsFromRelHum({ dryBulbC: 25, relativeHumidityPct: 50, pressurePa: 101325 }, { calculatedAt: '2026-06-25T10:00:00.000Z' })
    expect(result.result.dewPointC).toBeCloseTo(13.86, 2)
    expect(result.result.wetBulbC).toBeCloseTo(17.89, 2)
    expect(result.result.humidityRatioKgKg).toBeCloseTo(0.00988, 4)
    expect(result.result.moistAirEnthalpyKJkg).toBeCloseTo(50.32, 2)
    expect(result.source.provider).toContain('PsychroLib')
  })

  it('rejects invalid relative humidity and pressure', () => {
    expect(() => calculatePsychrometricsFromRelHum({ dryBulbC: 25, relativeHumidityPct: 120, pressurePa: 101325 })).toThrow()
    expect(() => calculatePsychrometricsFromRelHum({ dryBulbC: 25, relativeHumidityPct: 50, pressurePa: 0 })).toThrow()
  })
})
