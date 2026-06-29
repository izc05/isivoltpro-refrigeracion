import { describe, expect, it } from 'vitest'
import { calculateFromRelativeHumidity, comparePsychrometricStates } from '../calculation-engine/formulas/psychrometrics'
import { psychrometricExportFilename, psychrometricSummaryLines } from '../sprint0/psychrometric-chart-export'

describe('psychrometric chart export metadata', () => {
  it('creates a stable filename for one psychrometric state', () => {
    const state = calculateFromRelativeHumidity({ dryBulbC: 24, relativeHumidityPct: 50, pressurePa: 101325 }).result
    const filename = psychrometricExportFilename({ state, pressurePa: 101325, generatedAt: '2026-06-29T12:00:00.000Z' }, 'png')

    expect(filename).toBe('isivoltpro-psicrometria-2026-06-29-estado-24c-50hr.png')
  })

  it('includes the main state properties in the technical summary', () => {
    const state = calculateFromRelativeHumidity({ dryBulbC: 25, relativeHumidityPct: 50, pressurePa: 101325 }).result
    const lines = psychrometricSummaryLines({ state, pressurePa: 101325 })

    expect(lines.some((line) => line.includes('Estado: 25,0 °C'))).toBe(true)
    expect(lines.some((line) => line.includes('Punto de rocío'))).toBe(true)
    expect(lines.some((line) => line.includes('Entalpía'))).toBe(true)
    expect(lines.some((line) => line.includes('101,33 kPa'))).toBe(true)
  })

  it('describes A to B changes for a compared process', () => {
    const comparison = comparePsychrometricStates({
      a: { dryBulbC: 30, relativeHumidityPct: 60, pressurePa: 101325 },
      b: { dryBulbC: 14, relativeHumidityPct: 90, pressurePa: 101325 },
    }).result
    const lines = psychrometricSummaryLines({ comparison, pressurePa: 101325 })

    expect(lines[0]).toContain('Proceso:')
    expect(lines.some((line) => line.includes('Estado A'))).toBe(true)
    expect(lines.some((line) => line.includes('Estado B'))).toBe(true)
    expect(lines.some((line) => line.includes('ΔT'))).toBe(true)
  })
})
