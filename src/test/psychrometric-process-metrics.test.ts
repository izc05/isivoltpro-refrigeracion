import { describe, expect, it } from 'vitest'
import { comparePsychrometricStates } from '../calculation-engine/formulas/psychrometrics'
import { calculatePsychrometricProcessMetrics } from '../sprint0/psychrometric-process-metrics'

describe('psychrometric process metrics', () => {
  it('reports temperature, humidity and enthalpy changes', () => {
    const comparison = comparePsychrometricStates({
      a: { dryBulbC: 30, relativeHumidityPct: 50, pressurePa: 101325 },
      b: { dryBulbC: 18, relativeHumidityPct: 70, pressurePa: 101325 },
    }).result
    const metrics = calculatePsychrometricProcessMetrics(comparison)

    expect(metrics.deltaTemperatureK).toBeCloseTo(comparison.deltas.dryBulbC, 6)
    expect(metrics.deltaHumidityRatioGKg).toBeCloseTo(comparison.deltas.humidityRatioGKg, 6)
    expect(metrics.deltaEnthalpyKJkg).toBeCloseTo(comparison.deltas.moistAirEnthalpyKJkg, 6)
  })

  it('detects water removal during cooling with dehumidification', () => {
    const comparison = comparePsychrometricStates({
      a: { dryBulbC: 30, relativeHumidityPct: 60, pressurePa: 101325 },
      b: { dryBulbC: 14, relativeHumidityPct: 90, pressurePa: 101325 },
    }).result
    const metrics = calculatePsychrometricProcessMetrics(comparison)

    expect(metrics.waterDirection).toBe('removed')
    expect(metrics.waterChangeGKg).toBeGreaterThan(0)
    expect(metrics.pressureDifferencePa).toBe(0)
  })

  it('flags incompatible pressures', () => {
    const comparison = comparePsychrometricStates({
      a: { dryBulbC: 24, relativeHumidityPct: 50, pressurePa: 101325 },
      b: { dryBulbC: 24, relativeHumidityPct: 50, pressurePa: 95000 },
    }).result
    const metrics = calculatePsychrometricProcessMetrics(comparison)

    expect(metrics.pressureDifferencePa).toBeGreaterThan(500)
  })
})
