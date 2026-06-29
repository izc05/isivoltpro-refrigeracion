import type { PsychrometricComparisonResult } from '../calculation-engine/formulas/psychrometrics'
import { humidityRatioGKg } from './psychrometric-chart-math'

export type PsychrometricProcessMetrics = {
  deltaTemperatureK: number
  deltaHumidityRatioGKg: number
  deltaEnthalpyKJkg: number
  waterChangeGKg: number
  waterDirection: 'added' | 'removed' | 'stable'
  saturationExceeded: boolean
  maximumExcessGKg: number
  pressureDifferencePa: number
}

export function calculatePsychrometricProcessMetrics(comparison: PsychrometricComparisonResult): PsychrometricProcessMetrics {
  const { a, b, deltas } = comparison
  let maximumExcessGKg = 0

  for (let step = 0; step <= 40; step += 1) {
    const fraction = step / 40
    const temperatureC = a.dryBulbC + (b.dryBulbC - a.dryBulbC) * fraction
    const processHumidityGKg = a.humidityRatioGKg + (b.humidityRatioGKg - a.humidityRatioGKg) * fraction
    const pressurePa = a.pressurePa + (b.pressurePa - a.pressurePa) * fraction
    const saturationHumidityGKg = humidityRatioGKg(temperatureC, 100, pressurePa)

    if (Number.isFinite(saturationHumidityGKg)) {
      maximumExcessGKg = Math.max(maximumExcessGKg, processHumidityGKg - saturationHumidityGKg)
    }
  }

  const waterChangeGKg = Math.abs(deltas.humidityRatioGKg)
  const waterDirection = deltas.humidityRatioGKg > 0.05 ? 'added' : deltas.humidityRatioGKg < -0.05 ? 'removed' : 'stable'

  return {
    deltaTemperatureK: deltas.dryBulbC,
    deltaHumidityRatioGKg: deltas.humidityRatioGKg,
    deltaEnthalpyKJkg: deltas.moistAirEnthalpyKJkg,
    waterChangeGKg,
    waterDirection,
    saturationExceeded: maximumExcessGKg > 0.05,
    maximumExcessGKg: Math.max(0, maximumExcessGKg),
    pressureDifferencePa: Math.abs(b.pressurePa - a.pressurePa),
  }
}
