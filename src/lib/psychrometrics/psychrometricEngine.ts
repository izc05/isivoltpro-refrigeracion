import psychrolib from 'psychrolib'
import { calculateFromRelativeHumidity, type PsychrometricState } from '../../calculation-engine/formulas/psychrometrics'

export type PsychrometricStateInput = {
  dryBulbC: number
  relativeHumidityPct: number
  pressurePa: number
}

export function setPsychrometricUnitSystem() {
  psychrolib.SetUnitSystem(psychrolib.SI)
}

export function validatePsychrometricInput(input: PsychrometricStateInput) {
  if (!Number.isFinite(input.dryBulbC) || input.dryBulbC < -50 || input.dryBulbC > 80) throw new Error('La temperatura seca debe estar entre -50 y 80 °C.')
  if (!Number.isFinite(input.relativeHumidityPct) || input.relativeHumidityPct < 0 || input.relativeHumidityPct > 100) throw new Error('La humedad relativa debe estar entre 0 y 100 %.')
  if (!Number.isFinite(input.pressurePa) || input.pressurePa <= 0) throw new Error('La presión atmosférica debe ser positiva.')
}

export function calculatePsychrometricState(input: PsychrometricStateInput): PsychrometricState {
  validatePsychrometricInput(input)
  return calculateFromRelativeHumidity({
    dryBulbC: input.dryBulbC,
    relativeHumidityPct: Math.max(0.1, input.relativeHumidityPct),
    pressurePa: input.pressurePa,
  }).result
}

export function humidityRatioFromRelativeHumidity(dryBulbC: number, relativeHumidity: number, pressurePa: number) {
  setPsychrometricUnitSystem()
  if (relativeHumidity <= 0) return 0
  const humidityRatio = psychrolib.GetHumRatioFromRelHum(dryBulbC, relativeHumidity, pressurePa)
  return Number.isFinite(humidityRatio) && humidityRatio >= 0 ? humidityRatio : null
}

export function saturationHumidityRatio(dryBulbC: number, pressurePa: number) {
  setPsychrometricUnitSystem()
  const humidityRatio = psychrolib.GetSatHumRatio(dryBulbC, pressurePa)
  return Number.isFinite(humidityRatio) && humidityRatio >= 0 ? humidityRatio : null
}

export function humidityRatioFromWetBulb(dryBulbC: number, wetBulbC: number, pressurePa: number) {
  setPsychrometricUnitSystem()
  const humidityRatio = psychrolib.GetHumRatioFromTWetBulb(dryBulbC, wetBulbC, pressurePa)
  return Number.isFinite(humidityRatio) && humidityRatio >= 0 ? humidityRatio : null
}

export function humidityRatioFromEnthalpy(dryBulbC: number, enthalpyKJkg: number) {
  setPsychrometricUnitSystem()
  const humidityRatio = psychrolib.GetHumRatioFromEnthalpyAndTDryBulb(enthalpyKJkg * 1000, dryBulbC)
  return Number.isFinite(humidityRatio) && humidityRatio >= 0 ? humidityRatio : null
}

export function humidityRatioToGKg(humidityRatioKgKg: number) {
  return humidityRatioKgKg * 1000
}

export function isPhysicallyDrawablePoint(point: { x: number; y: number }) {
  return Number.isFinite(point.x) && Number.isFinite(point.y) && point.y >= 0 && point.y <= 60
}
