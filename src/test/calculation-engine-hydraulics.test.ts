import { describe, expect, it } from 'vitest'
import { calculateWaterFlow } from '../calculation-engine/formulas/hydraulics'

describe('calculation-engine hydraulics', () => {
  it('calculates water flow from power and delta T', () => {
    const result = calculateWaterFlow({ thermalPowerKw: 10, deltaTK: 5, specificHeatKjKgK: 4.186, densityKgM3: 1000 }, { calculatedAt: '2026-06-25T10:00:00.000Z' })
    expect(result.result.massFlowKgS).toBeCloseTo(0.4778, 4)
    expect(result.result.volumeFlowLs).toBeCloseTo(0.4778, 4)
    expect(result.result.volumeFlowM3H).toBeCloseTo(1.720, 3)
    expect(result.interpretation.formula).toContain('Potencia')
  })

  it('rejects invalid delta T and power', () => {
    expect(() => calculateWaterFlow({ thermalPowerKw: 0, deltaTK: 5, specificHeatKjKgK: 4.186, densityKgM3: 1000 })).toThrow()
    expect(() => calculateWaterFlow({ thermalPowerKw: 10, deltaTK: 0, specificHeatKjKgK: 4.186, densityKgM3: 1000 })).toThrow()
  })
})
