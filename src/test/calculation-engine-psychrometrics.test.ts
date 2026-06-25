import { describe, expect, it } from 'vitest'
import {
  calculateCondensationRisk,
  calculateFromDewPoint,
  calculateFromRelativeHumidity,
  calculateFromWetBulb,
  calculatePsychrometricsFromRelHum,
  comparePsychrometricStates,
} from '../calculation-engine/formulas/psychrometrics'
import { altitudeToAtmospherePa, parseLocalizedNumber } from '../domain/units'

describe('calculation-engine psychrometrics', () => {
  it('calculates moist air properties from dry bulb and relative humidity', () => {
    const result = calculatePsychrometricsFromRelHum({ dryBulbC: 25, relativeHumidityPct: 50, pressurePa: 101325 }, { calculatedAt: '2026-06-25T10:00:00.000Z' })
    expect(result.result.dewPointC).toBeCloseTo(13.86, 2)
    expect(result.result.wetBulbC).toBeCloseTo(17.89, 2)
    expect(result.result.humidityRatioKgKg).toBeCloseTo(0.00988, 4)
    expect(result.result.moistAirEnthalpyKJkg).toBeCloseTo(50.32, 2)
    expect(result.result.humidityRatioGKg).toBeGreaterThan(9.8)
    expect(result.result.humidityRatioGKg).toBeLessThan(10)
    expect(result.result.absoluteHumidityGM3).toBeGreaterThan(11)
    expect(result.result.moistAirDensityKgM3).toBeGreaterThan(1.1)
    expect(result.source.provider).toContain('PsychroLib')
  })

  it('calculates equivalent states from wet bulb and dew point', () => {
    const fromWetBulb = calculateFromWetBulb({ dryBulbC: 25, wetBulbC: 17.9, pressurePa: 101325 })
    const fromDewPoint = calculateFromDewPoint({ dryBulbC: 25, dewPointC: 13.86, pressurePa: 101325 })
    expect(fromWetBulb.result.relativeHumidityPct).toBeCloseTo(50, 0)
    expect(fromDewPoint.result.relativeHumidityPct).toBeCloseTo(50, 0)
  })

  it('rejects invalid relative humidity and pressure', () => {
    expect(() => calculatePsychrometricsFromRelHum({ dryBulbC: 25, relativeHumidityPct: 120, pressurePa: 101325 })).toThrow()
    expect(() => calculatePsychrometricsFromRelHum({ dryBulbC: 25, relativeHumidityPct: 50, pressurePa: 0 })).toThrow()
  })

  it('rejects invalid wet bulb and dew point relationships', () => {
    expect(() => calculateFromWetBulb({ dryBulbC: 20, wetBulbC: 21, pressurePa: 101325 })).toThrow()
    expect(() => calculateFromDewPoint({ dryBulbC: 20, dewPointC: 21, pressurePa: 101325 })).toThrow()
  })

  it('detects condensation risk with a safety margin', () => {
    const high = calculateCondensationRisk({ dryBulbC: 25, relativeHumidityPct: 60, surfaceTempC: 12, safetyMarginK: 2, pressurePa: 101325 })
    const none = calculateCondensationRisk({ dryBulbC: 25, relativeHumidityPct: 50, surfaceTempC: 20, safetyMarginK: 2, pressurePa: 101325 })
    expect(high.result.risk).toBe('high')
    expect(high.warnings.some((warning) => warning.severity === 'danger')).toBe(true)
    expect(none.result.risk).toBe('none')
  })

  it('keeps altitude pressure and localized decimals usable', () => {
    expect(altitudeToAtmospherePa(1000)).toBeLessThan(101325)
    expect(parseLocalizedNumber('25,5')).toBe(25.5)
    const result = calculateFromRelativeHumidity({ dryBulbC: parseLocalizedNumber('25,0'), relativeHumidityPct: parseLocalizedNumber('50,0'), pressurePa: altitudeToAtmospherePa(1000) })
    expect(result.result.pressurePa).toBeLessThan(101325)
  })

  it('compares two states and classifies the process direction', () => {
    const comparison = comparePsychrometricStates({
      a: { dryBulbC: 30, relativeHumidityPct: 50, pressurePa: 101325 },
      b: { dryBulbC: 20, relativeHumidityPct: 50, pressurePa: 101325 },
    })
    expect(comparison.result.deltas.dryBulbC).toBeCloseTo(-10, 2)
    expect(comparison.result.deltas.moistAirEnthalpyKJkg).toBeLessThan(0)
    expect(comparison.result.processType).toBe('cooling-dehumidification')
  })
})
