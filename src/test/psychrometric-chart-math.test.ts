import { describe, expect, it } from 'vitest'
import { calculateFromRelativeHumidity } from '../calculation-engine/formulas/psychrometrics'
import { enthalpyLine, humidityRatioGKg, relativeHumidityCurve, saturationPressurePa } from '../sprint0/psychrometric-chart-math'

describe('psychrometric chart math', () => {
  it('uses the same humidity ratio as the professional PsychroLib calculation', () => {
    const state = calculateFromRelativeHumidity({ dryBulbC: 25, relativeHumidityPct: 50, pressurePa: 101325 }).result
    expect(humidityRatioGKg(25, 50, 101325)).toBeCloseTo(state.humidityRatioGKg, 6)
  })

  it('builds ordered relative humidity curves inside chart bounds', () => {
    const curve = relativeHumidityCurve(50, 101325)
    expect(curve.length).toBeGreaterThan(30)
    expect(curve[0].dryBulbC).toBeLessThan(curve[curve.length - 1].dryBulbC)
    expect(curve.every((point) => point.humidityRatioGKg >= 0 && point.humidityRatioGKg <= 30)).toBe(true)
  })

  it('creates a usable constant enthalpy guide', () => {
    const line = enthalpyLine(50)
    expect(line.length).toBeGreaterThan(20)
    expect(line.every((point) => Number.isFinite(point.humidityRatioGKg))).toBe(true)
  })

  it('returns a realistic saturation pressure at 25 C', () => {
    const pressure = saturationPressurePa(25)
    expect(pressure).toBeGreaterThan(3160)
    expect(pressure).toBeLessThan(3180)
  })
})
