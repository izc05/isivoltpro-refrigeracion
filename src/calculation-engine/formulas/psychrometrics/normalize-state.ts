import psychrolib from 'psychrolib'
import type { PsychrometricChartPoint, PsychrometricState } from './types'

const WATER_VAPOR_GAS_CONSTANT = 461.5

export function setPsychrolibSI() {
  psychrolib.SetUnitSystem(psychrolib.SI)
}

export function calculateAbsoluteHumidityGM3(vaporPressurePa: number, dryBulbC: number) {
  const kelvin = dryBulbC + 273.15
  if (kelvin <= 0) throw new Error('La temperatura absoluta debe ser mayor que 0 K.')
  return (vaporPressurePa / (WATER_VAPOR_GAS_CONSTANT * kelvin)) * 1000
}

function assertFiniteState(state: PsychrometricState) {
  for (const [key, value] of Object.entries(state)) {
    if (!Number.isFinite(value)) throw new Error(`PsychroLib no pudo calcular ${key} con esos datos.`)
  }
}

export function normalizeStateFromHumidityRatio(input: { dryBulbC: number; humidityRatioKgKg: number; pressurePa: number }): PsychrometricState {
  setPsychrolibSI()
  const wetBulbC = psychrolib.GetTWetBulbFromHumRatio(input.dryBulbC, input.humidityRatioKgKg, input.pressurePa)
  const dewPointC = psychrolib.GetTDewPointFromHumRatio(input.dryBulbC, input.humidityRatioKgKg, input.pressurePa)
  const relativeHumidityPct = psychrolib.GetRelHumFromHumRatio(input.dryBulbC, input.humidityRatioKgKg, input.pressurePa) * 100
  const vaporPressurePa = psychrolib.GetVapPresFromHumRatio(input.humidityRatioKgKg, input.pressurePa)
  const saturationVaporPressurePa = psychrolib.GetSatVapPres(input.dryBulbC)
  const state: PsychrometricState = {
    dryBulbC: input.dryBulbC,
    relativeHumidityPct,
    wetBulbC,
    dewPointC,
    humidityRatioKgKg: input.humidityRatioKgKg,
    humidityRatioGKg: input.humidityRatioKgKg * 1000,
    absoluteHumidityGM3: calculateAbsoluteHumidityGM3(vaporPressurePa, input.dryBulbC),
    vaporPressurePa,
    saturationVaporPressurePa,
    vaporPressureDeficitPa: Math.max(0, saturationVaporPressurePa - vaporPressurePa),
    moistAirEnthalpyKJkg: psychrolib.GetMoistAirEnthalpy(input.dryBulbC, input.humidityRatioKgKg) / 1000,
    moistAirVolumeM3kg: psychrolib.GetMoistAirVolume(input.dryBulbC, input.humidityRatioKgKg, input.pressurePa),
    moistAirDensityKgM3: psychrolib.GetMoistAirDensity(input.dryBulbC, input.humidityRatioKgKg, input.pressurePa),
    degreeOfSaturationPct: psychrolib.GetDegreeOfSaturation(input.dryBulbC, input.humidityRatioKgKg, input.pressurePa) * 100,
    dewPointSpreadK: input.dryBulbC - dewPointC,
    pressurePa: input.pressurePa,
  }
  assertFiniteState(state)
  return state
}

export function toPsychrometricChartPoint(state: PsychrometricState, id = 'state', label = 'Estado'): PsychrometricChartPoint {
  return {
    id,
    label,
    dryBulbC: state.dryBulbC,
    humidityRatioGKg: state.humidityRatioGKg,
    relativeHumidityPct: state.relativeHumidityPct,
    dewPointC: state.dewPointC,
    enthalpyKJkg: state.moistAirEnthalpyKJkg,
  }
}
