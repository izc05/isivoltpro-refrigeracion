import psychrolib from 'psychrolib'
import { setPsychrolibSI } from './normalize-state'

export const CHART_BOUNDS = { minT: -10, maxT: 50, minW: 0, maxW: 30 } as const

export type ChartPoint = {
  dryBulbC: number
  humidityRatioGKg: number
}

export function chartHumidityRatioGKg(dryBulbC: number, relativeHumidityPct: number, pressurePa: number): number {
  if (!Number.isFinite(dryBulbC) || !Number.isFinite(relativeHumidityPct) || !Number.isFinite(pressurePa) || pressurePa <= 0) return Number.NaN
  setPsychrolibSI()
  const relativeHumidity = Math.min(1, Math.max(0, relativeHumidityPct / 100))
  const humidityRatioKgKg = psychrolib.GetHumRatioFromRelHum(dryBulbC, relativeHumidity, pressurePa)
  return humidityRatioKgKg * 1000
}

function humidityRatioFromEnthalpyKgKg(dryBulbC: number, enthalpyKJkg: number): number {
  if (!Number.isFinite(dryBulbC) || !Number.isFinite(enthalpyKJkg)) return Number.NaN
  setPsychrolibSI()
  const targetJkg = enthalpyKJkg * 1000
  const dryAirEnthalpyJkg = psychrolib.GetMoistAirEnthalpy(dryBulbC, 0)
  if (targetJkg < dryAirEnthalpyJkg) return Number.NaN

  let low = 0
  let high = 0.06
  for (let index = 0; index < 45; index += 1) {
    const middle = (low + high) / 2
    const calculatedJkg = psychrolib.GetMoistAirEnthalpy(dryBulbC, middle)
    if (calculatedJkg < targetJkg) low = middle
    else high = middle
  }
  return (low + high) / 2
}

export function relativeHumidityCurve(relativeHumidityPct: number, pressurePa: number): ChartPoint[] {
  const points: ChartPoint[] = []
  for (let dryBulbC = CHART_BOUNDS.minT; dryBulbC <= CHART_BOUNDS.maxT; dryBulbC += 1) {
    const humidityRatioGKg = chartHumidityRatioGKg(dryBulbC, relativeHumidityPct, pressurePa)
    if (Number.isFinite(humidityRatioGKg) && humidityRatioGKg >= CHART_BOUNDS.minW && humidityRatioGKg <= CHART_BOUNDS.maxW) {
      points.push({ dryBulbC, humidityRatioGKg })
    }
  }
  return points
}

export function enthalpyLine(enthalpyKJkg: number): ChartPoint[] {
  const points: ChartPoint[] = []
  for (let dryBulbC = CHART_BOUNDS.minT; dryBulbC <= CHART_BOUNDS.maxT; dryBulbC += 1) {
    const humidityRatioGKg = humidityRatioFromEnthalpyKgKg(dryBulbC, enthalpyKJkg) * 1000
    if (Number.isFinite(humidityRatioGKg) && humidityRatioGKg >= CHART_BOUNDS.minW && humidityRatioGKg <= CHART_BOUNDS.maxW) {
      points.push({ dryBulbC, humidityRatioGKg })
    }
  }
  return points
}
