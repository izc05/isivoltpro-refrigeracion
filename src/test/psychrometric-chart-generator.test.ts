import { describe, expect, it } from 'vitest'
import { atmosphericPressureFromAltitude } from '../lib/psychrometrics/atmosphericPressure'
import { generatePsychrometricCurves, generateRelativeHumidityCurve } from '../lib/psychrometrics/chartGenerator'
import { calculatePsychrometricState } from '../lib/psychrometrics/psychrometricEngine'
import { calculateProcessPower, classifyPsychrometricProcess } from '../lib/psychrometrics/processCalculations'

describe('interactive psychrometric chart engine', () => {
  it('calculates the reference state used by the chart', () => {
    const state = calculatePsychrometricState({ dryBulbC: 25, relativeHumidityPct: 50, pressurePa: 101325 })
    expect(state.humidityRatioGKg).toBeCloseTo(9.88, 1)
    expect(state.dewPointC).toBeCloseTo(13.9, 1)
    expect(state.wetBulbC).toBeLessThanOrEqual(state.dryBulbC)
    expect(state.dewPointC).toBeLessThanOrEqual(state.dryBulbC)
    expect(state.moistAirEnthalpyKJkg).toBeCloseTo(50, 0)
  })

  it('generates valid relative humidity curves in g/kg', () => {
    const curve = generateRelativeHumidityCurve({ relativeHumidity: 0.5, pressurePa: 101325, minTemperature: -10, maxTemperature: 50, temperatureStep: 0.5 })
    expect(curve.length).toBeGreaterThan(80)
    expect(curve.every((point) => Number.isFinite(point.x) && Number.isFinite(point.y) && point.y >= 0)).toBe(true)
    expect(curve.find((point) => point.x === 25)?.y).toBeCloseTo(9.88, 1)
  })

  it('recalculates curves when pressure changes with altitude', () => {
    const seaLevel = generateRelativeHumidityCurve({ relativeHumidity: 0.5, pressurePa: 101325 })
    const altitudePressure = atmosphericPressureFromAltitude(1500)
    const altitude = generateRelativeHumidityCurve({ relativeHumidity: 0.5, pressurePa: altitudePressure })
    const seaPoint = seaLevel.find((point) => point.x === 25)
    const altitudePoint = altitude.find((point) => point.x === 25)
    expect(altitudePressure).toBeLessThan(101325)
    expect(altitudePoint?.y).toBeGreaterThan(seaPoint?.y ?? 0)
  })

  it('generates advanced line families without impossible values', () => {
    const curves = generatePsychrometricCurves({ pressurePa: 101325, advanced: true })
    expect(curves.saturation.length).toBeGreaterThan(80)
    expect(curves.relativeHumidity).toHaveLength(9)
    expect(curves.enthalpy.some((line) => line.points.length > 5)).toBe(true)
    expect(curves.wetBulb.some((line) => line.points.length > 5)).toBe(true)
    expect(curves.specificVolume.some((line) => line.points.length > 5)).toBe(true)
  })

  it('classifies a process and calculates optional power from airflow', () => {
    const a = calculatePsychrometricState({ dryBulbC: 25, relativeHumidityPct: 50, pressurePa: 101325 })
    const b = calculatePsychrometricState({ dryBulbC: 15, relativeHumidityPct: 80, pressurePa: 101325 })
    expect(classifyPsychrometricProcess(a, b)).toBe('Enfriamiento con deshumidificación')
    const power = calculateProcessPower(a, b, 1000)
    expect(power).not.toBeNull()
    expect(power?.totalKw).toBeLessThan(0)
  })
})
