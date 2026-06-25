import { describe, expect, it } from 'vitest'
import { calculateDuctSizing } from '../calculation-engine/formulas/ducts'

describe('calculation-engine ducts', () => {
  it('calculates duct area and circular equivalent diameter', () => {
    const result = calculateDuctSizing({ airflowM3h: 1000, maxVelocityMs: 5, preferredAspectRatio: 2 }, { calculatedAt: '2026-06-25T10:00:00.000Z' })
    expect(result.result.airflowM3s).toBeCloseTo(0.2778, 4)
    expect(result.result.areaM2).toBeCloseTo(0.05556, 5)
    expect(result.result.circularDiameterMm).toBeCloseTo(266, 0)
    expect(result.result.rectangularWidthMm).toBeGreaterThan(result.result.rectangularHeightMm)
    expect(result.result.pressureLossPaM).toBeGreaterThan(0)
    expect(result.result.hydraulicDiameterMm).toBeGreaterThan(0)
    expect(result.result.alternatives).toHaveLength(4)
  })

  it('converts airflow units and estimates linear pressure loss', () => {
    const result = calculateDuctSizing({ airflowM3h: 278, airflowUnit: 'L/s', maxVelocityMs: 5, preferredAspectRatio: 2, lengthM: 12 })
    expect(result.result.airflowM3h).toBeCloseTo(1000.8, 1)
    expect(result.result.totalLinearLossPa).toBeCloseTo(result.result.pressureLossPaM * 12, 5)
    expect(result.result.totalLinearLossMmca).toBeCloseTo(result.result.totalLinearLossPa / 9.80665, 5)
  })

  it('increases pressure loss with rougher flexible duct material', () => {
    const smooth = calculateDuctSizing({ airflowM3h: 1000, maxVelocityMs: 5, preferredAspectRatio: 2, material: 'galvanized-steel' })
    const rough = calculateDuctSizing({ airflowM3h: 1000, maxVelocityMs: 5, preferredAspectRatio: 2, material: 'corrugated-flex' })
    expect(rough.result.pressureLossPaM).toBeGreaterThan(smooth.result.pressureLossPaM)
  })

  it('supports sizing by target friction', () => {
    const result = calculateDuctSizing({ airflowM3h: 2500, method: 'friction', targetPressureLossPaM: 0.8, maxVelocityMs: 6, preferredAspectRatio: 2 })
    expect(result.result.pressureLossPaM).toBeGreaterThan(0)
    expect(Math.abs(result.result.pressureLossPaM - 0.8)).toBeLessThan(0.6)
  })

  it('rejects invalid airflow and excessive velocity', () => {
    expect(() => calculateDuctSizing({ airflowM3h: 0, maxVelocityMs: 5, preferredAspectRatio: 2 })).toThrow()
    expect(() => calculateDuctSizing({ airflowM3h: 1000, maxVelocityMs: 30, preferredAspectRatio: 2 })).toThrow()
  })
})
