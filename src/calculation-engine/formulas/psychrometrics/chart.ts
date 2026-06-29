import psychrolib from 'psychrolib'
import { setPsychrolibSI } from './normalize-state'

export const CHART_BOUNDS = { minT: -10, maxT: 50, minW: 0, maxW: 30 } as const

export type ChartPoint = {
  dryBulbC: number
  humidityRatioGKg: number
}

function isVisibleChartPoint(humidityRatioGKg: number) {
  return Number.isFinite(humidityRatioGKg)
    && humidityRatioGKg >= CHART_BOUNDS.minW
    && humidityRatioGKg <= CHART_BOUNDS.maxW
}

export function chartSaturationPressurePa(dryBulbC: number): number {
  if (!Number.isFinite(dryBulbC)) return Number.NaN
  setPsychrolibSI()
  return psychrolib.GetSatVapPres(dryBulbC)
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

function humidityRatioFromSpecificVolumeKgKg(dryBulbC: number, specificVolumeM3kg: number, pressurePa: number): number {
  if (!Number.isFinite(dryBulbC) || !Number.isFinite(specificVolumeM3kg) || !Number.isFinite(pressurePa) || pressurePa <= 0) return Number.NaN
  setPsychrolibSI()
  const saturationHumidityRatioKgKg = chartHumidityRatioGKg(dryBulbC, 100, pressurePa) / 1000
  if (!Number.isFinite(saturationHumidityRatioKgKg) || saturationHumidityRatioKgKg < 0) return Number.NaN

  const dryAirVolume = psychrolib.GetMoistAirVolume(dryBulbC, 0, pressurePa)
  const saturatedVolume = psychrolib.GetMoistAirVolume(dryBulbC, saturationHumidityRatioKgKg, pressurePa)
  if (specificVolumeM3kg < dryAirVolume || specificVolumeM3kg > saturatedVolume) return Number.NaN

  let low = 0
  let high = saturationHumidityRatioKgKg
  for (let index = 0; index < 45; index += 1) {
    const middle = (low + high) / 2
    const calculatedVolume = psychrolib.GetMoistAirVolume(dryBulbC, middle, pressurePa)
    if (calculatedVolume < specificVolumeM3kg) low = middle
    else high = middle
  }
  return (low + high) / 2
}

export function relativeHumidityCurve(relativeHumidityPct: number, pressurePa: number): ChartPoint[] {
  const points: ChartPoint[] = []
  for (let dryBulbC = CHART_BOUNDS.minT; dryBulbC <= CHART_BOUNDS.maxT; dryBulbC += 1) {
    const humidityRatioGKg = chartHumidityRatioGKg(dryBulbC, relativeHumidityPct, pressurePa)
    if (isVisibleChartPoint(humidityRatioGKg)) points.push({ dryBulbC, humidityRatioGKg })
  }
  return points
}

export function wetBulbLine(wetBulbC: number, pressurePa: number): ChartPoint[] {
  if (!Number.isFinite(wetBulbC) || !Number.isFinite(pressurePa) || pressurePa <= 0) return []
  setPsychrolibSI()
  const points: ChartPoint[] = []
  const startTemperatureC = Math.max(CHART_BOUNDS.minT, Math.ceil(wetBulbC))

  for (let dryBulbC = startTemperatureC; dryBulbC <= CHART_BOUNDS.maxT; dryBulbC += 1) {
    try {
      const humidityRatioGKg = psychrolib.GetHumRatioFromTWetBulb(dryBulbC, wetBulbC, pressurePa) * 1000
      const saturationGKg = chartHumidityRatioGKg(dryBulbC, 100, pressurePa)
      if (isVisibleChartPoint(humidityRatioGKg) && humidityRatioGKg <= saturationGKg + 0.01) {
        points.push({ dryBulbC, humidityRatioGKg })
      }
    } catch {
      // PsychroLib rejects combinations outside the physical domain.
    }
  }
  return points
}

export function enthalpyLine(enthalpyKJkg: number): ChartPoint[] {
  const points: ChartPoint[] = []
  for (let dryBulbC = CHART_BOUNDS.minT; dryBulbC <= CHART_BOUNDS.maxT; dryBulbC += 1) {
    const humidityRatioGKg = humidityRatioFromEnthalpyKgKg(dryBulbC, enthalpyKJkg) * 1000
    if (isVisibleChartPoint(humidityRatioGKg)) points.push({ dryBulbC, humidityRatioGKg })
  }
  return points
}

export function specificVolumeLine(specificVolumeM3kg: number, pressurePa: number): ChartPoint[] {
  const points: ChartPoint[] = []
  for (let dryBulbC = CHART_BOUNDS.minT; dryBulbC <= CHART_BOUNDS.maxT; dryBulbC += 1) {
    const humidityRatioGKg = humidityRatioFromSpecificVolumeKgKg(dryBulbC, specificVolumeM3kg, pressurePa) * 1000
    if (isVisibleChartPoint(humidityRatioGKg)) points.push({ dryBulbC, humidityRatioGKg })
  }
  return points
}
