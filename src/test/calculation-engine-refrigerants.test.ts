import { describe, expect, it } from 'vitest'
import type { RefrigerantTable } from '../data/generated/refrigerants'
import { calculateAdditionalCharge, calculatePressureTemperature, calculateSubcooling, calculateSuperheat, compareRefrigerants } from '../calculation-engine/formulas/refrigerants'
import type { RefrigerantProvider } from '../calculation-engine/providers/refrigerant-provider'

const fixture: RefrigerantTable = {
  schemaVersion: 1,
  generatedAt: '2026-06-25T00:00:00.000Z',
  generator: 'CoolProp',
  coolPropVersion: 'fixture',
  refrigerant: 'R407C',
  refrigerantType: 'zeotropic',
  validRange: { minC: 0, maxC: 20, minPressurePaAbs: 100000, maxPressurePaAbs: 300000 },
  limitations: ['Fixture monotonic test table.'],
  points: [
    { pressurePaAbs: 100000, bubbleC: 0, dewC: 3, source: 'fixture' },
    { pressurePaAbs: 200000, bubbleC: 10, dewC: 14, source: 'fixture' },
    { pressurePaAbs: 300000, bubbleC: 20, dewC: 25, source: 'fixture' },
  ],
}

const provider: RefrigerantProvider = {
  id: 'fixture-provider',
  listRefrigerants: () => [{ key: fixture.refrigerant, name: fixture.refrigerant, category: 'test', safetyClass: null, tableStatus: 'validated' }],
  getTable: () => fixture,
  getSource: () => ({ provider: 'fixture', version: '1', generatedAt: fixture.generatedAt, limitations: fixture.limitations }),
}

const context = { calculatedAt: '2026-06-25T10:00:00.000Z' }

describe('calculation-engine refrigerants', () => {
  it('converts gauge pressure to absolute and returns dew/bubble temperatures', () => {
    const result = calculatePressureTemperature({ refrigerant: 'R407C', mode: 'pressure-to-temperature', pressure: 1, pressureUnit: 'bar', pressureKind: 'gauge', temperatureUnit: 'C', branch: 'dew', atmospherePa: 100000 }, provider, context)
    expect(result.result.pressurePaAbs).toBe(200000)
    expect(result.result.pressureGaugePa).toBe(100000)
    expect(result.result.dewC).toBeCloseTo(14)
    expect(result.result.bubbleC).toBeCloseTo(10)
    expect(result.warnings.some((warning) => warning.code === 'DEW_BUBBLE_REQUIRED')).toBe(true)
  })

  it('converts temperature to pressure and exposes absolute/gauge equivalents', () => {
    const result = calculatePressureTemperature({ refrigerant: 'R407C', mode: 'temperature-to-pressure', temperature: 15, temperatureUnit: 'C', pressureUnit: 'bar', pressureKind: 'absolute', branch: 'bubble', atmospherePa: 100000 }, provider, context)
    expect(result.result.pressurePaAbs).toBeCloseTo(250000)
    expect(result.result.pressureEquivalents.bar_absolute).toBeCloseTo(2.5)
    expect(result.result.pressureEquivalents.bar_gauge).toBeCloseTo(1.5)
  })

  it('supports Fahrenheit inputs without changing the Kelvin result', () => {
    const result = calculateSuperheat({ refrigerant: 'R407C', suctionPressure: 1, pressureUnit: 'bar', pressureKind: 'gauge', suctionPipeTemperature: 68, temperatureUnit: 'F', atmospherePa: 100000 }, provider, context)
    expect(result.result.saturationC).toBeCloseTo(14)
    expect(result.result.measuredC).toBeCloseTo(20)
    expect(result.result.resultK).toBeCloseTo(6)
  })

  it('calculates subcooling with bubble saturation', () => {
    const result = calculateSubcooling({ refrigerant: 'R407C', liquidPressure: 2, pressureUnit: 'bar', pressureKind: 'absolute', liquidLineTemperature: 7, temperatureUnit: 'C', atmospherePa: 100000 }, provider, context)
    expect(result.result.saturationC).toBeCloseTo(10)
    expect(result.result.resultK).toBeCloseTo(3)
  })

  it('rejects incomplete and unsafe pressure inputs', () => {
    expect(() => calculatePressureTemperature({ refrigerant: 'R407C', mode: 'pressure-to-temperature', pressureUnit: 'bar', pressureKind: 'gauge', temperatureUnit: 'C', branch: 'dew', atmospherePa: 100000 }, provider, context)).toThrow()
    expect(() => calculatePressureTemperature({ refrigerant: 'R407C', mode: 'pressure-to-temperature', pressure: -2, pressureUnit: 'bar', pressureKind: 'gauge', temperatureUnit: 'C', branch: 'dew', atmospherePa: 100000 }, provider, context)).toThrow(RangeError)
  })

  it('rejects values outside the validated table range', () => {
    expect(() => calculatePressureTemperature({ refrigerant: 'R407C', mode: 'pressure-to-temperature', pressure: 5, pressureUnit: 'bar', pressureKind: 'absolute', temperatureUnit: 'C', branch: 'dew', atmospherePa: 100000 }, provider, context)).toThrow(RangeError)
  })

  it('calculates additional charge and marks pressure-only charging as forbidden', () => {
    const result = calculateAdditionalCharge({ factoryCharge: 0.85, factoryUnit: 'kg', includedLength: 5, installedLength: 12, lengthUnit: 'm', additionalPerMeterG: 20, recovered: 0, recoveredUnit: 'g', added: 0, addedUnit: 'g' }, context)
    expect(result.result.additionalChargeG).toBe(140)
    expect(result.result.totalChargeG).toBe(990)
    expect(result.warnings.some((warning) => warning.code === 'NO_PRESSURE_ONLY_CHARGE')).toBe(true)
  })

  it('compares refrigerants without declaring interchangeability', () => {
    const result = compareRefrigerants({ refrigerants: ['R407C', 'R407C'], temperaturesC: [10], branch: 'dew' }, provider, context)
    expect(result.result.rows[0].pressuresPaAbs.R407C).toBeCloseTo(163636.36, 1)
    expect(result.warnings.some((warning) => warning.code === 'NOT_INTERCHANGEABLE')).toBe(true)
  })
})
