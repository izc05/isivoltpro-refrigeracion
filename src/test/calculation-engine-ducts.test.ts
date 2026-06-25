import { describe, expect, it } from 'vitest'
import { calculateDuctSizing } from '../calculation-engine/formulas/ducts'

describe('calculation-engine ducts', () => {
  it('calculates duct area and circular equivalent diameter', () => {
    const result = calculateDuctSizing({ airflowM3h: 1000, maxVelocityMs: 5, preferredAspectRatio: 2 }, { calculatedAt: '2026-06-25T10:00:00.000Z' })
    expect(result.result.airflowM3s).toBeCloseTo(0.2778, 4)
    expect(result.result.areaM2).toBeCloseTo(0.05556, 5)
    expect(result.result.circularDiameterMm).toBeCloseTo(266, 0)
    expect(result.result.rectangularWidthMm).toBeGreaterThan(result.result.rectangularHeightMm)
  })

  it('rejects invalid airflow and excessive velocity', () => {
    expect(() => calculateDuctSizing({ airflowM3h: 0, maxVelocityMs: 5, preferredAspectRatio: 2 })).toThrow()
    expect(() => calculateDuctSizing({ airflowM3h: 1000, maxVelocityMs: 30, preferredAspectRatio: 2 })).toThrow()
  })
})
