import { describe, expect, it } from 'vitest'
import { refrigerantTables } from '../data/generated'
import { maxGlideK, commonPressureRows } from '../domain/refrigerants/summary'
import { interpolatePressureFromTemperature, interpolateTemperatureFromPressure } from '../domain/refrigerants/calculations'
import { paAbsoluteToPressure, pressureToPaAbsolute } from '../domain/units'

describe('generated CoolProp data', () => {
  it('contains generated data for the validated initial refrigerants', () => {
    const generated = refrigerantTables.filter((table) => table.generator === 'CoolProp')
    expect(generated.map((table) => table.refrigerant)).toEqual(expect.arrayContaining(['R32', 'R410A', 'R134a', 'R407C', 'R404A', 'R22', 'R290', 'R600a', 'R1234yf', 'R744']))
    expect(generated.every((table) => table.points.length >= 100)).toBe(true)
  })

  it('keeps pressures monotonic and absolute', () => {
    for (const table of refrigerantTables.filter((entry) => entry.generator === 'CoolProp')) {
      for (let index = 1; index < table.points.length; index += 1) {
        expect(table.points[index].pressurePaAbs).toBeGreaterThan(table.points[index - 1].pressurePaAbs)
        expect(table.points[index].pressurePaAbs).toBeGreaterThan(0)
      }
    }
  })

  it('preserves zeotropic glide for R407C', () => {
    const r407c = refrigerantTables.find((table) => table.refrigerant === 'R407C')
    expect(r407c).toBeDefined()
    expect(maxGlideK(r407c!)).toBeGreaterThan(5)
  })

  it('can derive comparison rows from generated tables', () => {
    const r32 = refrigerantTables.find((table) => table.refrigerant === 'R32')!
    const rows = commonPressureRows(r32, [0, 5, 10])
    expect(rows).toHaveLength(3)
    expect(rows.every((row) => row.dewPressurePaAbs !== null)).toBe(true)
  })

  it('matches the accepted R32 manometric field checks', () => {
    const r32 = refrigerantTables.find((table) => table.refrigerant === 'R32')!
    const measuredPressure = pressureToPaAbsolute(9, 'bar', 'gauge')
    expect(interpolateTemperatureFromPressure(r32, measuredPressure, 'dew')).toBeCloseTo(6.67, 1)
    const targetPressure = interpolatePressureFromTemperature(r32, 5, 'dew')
    expect(paAbsoluteToPressure(targetPressure, 'bar', 'gauge')).toBeCloseTo(8.5, 1)
  })
})
