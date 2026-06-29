import { describe, expect, it } from 'vitest'
import psychrolib from 'psychrolib'
import { enthalpyLine, specificVolumeLine, wetBulbLine } from '../calculation-engine/formulas/psychrometrics'

describe('professional psychrometric chart lines', () => {
  it('builds wet-bulb lines that reproduce the selected wet-bulb temperature', () => {
    psychrolib.SetUnitSystem(psychrolib.SI)
    const line = wetBulbLine(15, 101325)
    expect(line.length).toBeGreaterThan(15)
    const sample = line[Math.floor(line.length / 2)]
    const calculatedWetBulbC = psychrolib.GetTWetBulbFromHumRatio(sample.dryBulbC, sample.humidityRatioGKg / 1000, 101325)
    expect(calculatedWetBulbC).toBeCloseTo(15, 4)
  })

  it('builds constant enthalpy lines across the visible chart', () => {
    psychrolib.SetUnitSystem(psychrolib.SI)
    const line = enthalpyLine(50)
    expect(line.length).toBeGreaterThan(20)
    const sample = line[Math.floor(line.length / 2)]
    const calculatedKJkg = psychrolib.GetMoistAirEnthalpy(sample.dryBulbC, sample.humidityRatioGKg / 1000) / 1000
    expect(calculatedKJkg).toBeCloseTo(50, 4)
  })

  it('builds constant specific-volume lines using the selected pressure', () => {
    psychrolib.SetUnitSystem(psychrolib.SI)
    const line = specificVolumeLine(0.9, 101325)
    expect(line.length).toBeGreaterThan(5)
    const sample = line[Math.floor(line.length / 2)]
    const calculatedM3kg = psychrolib.GetMoistAirVolume(sample.dryBulbC, sample.humidityRatioGKg / 1000, 101325)
    expect(calculatedM3kg).toBeCloseTo(0.9, 5)
  })

  it('moves specific-volume guides when atmospheric pressure changes', () => {
    const seaLevelLine = specificVolumeLine(0.9, 101325)
    const altitudeLine = specificVolumeLine(0.9, 90000)
    expect(seaLevelLine.length).toBeGreaterThan(0)
    expect(altitudeLine.length).toBeGreaterThan(0)
    expect(seaLevelLine[0].dryBulbC).not.toBe(altitudeLine[0].dryBulbC)
  })
})
