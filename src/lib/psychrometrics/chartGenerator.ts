import {
  humidityRatioFromEnthalpy,
  humidityRatioFromRelativeHumidity,
  humidityRatioFromWetBulb,
  humidityRatioToGKg,
  isPhysicallyDrawablePoint,
  saturationHumidityRatio,
} from './psychrometricEngine'

export type ChartPoint = { x: number; y: number }

export type ChartGenerationOptions = {
  pressurePa: number
  minTemperature?: number
  maxTemperature?: number
  temperatureStep?: number
}

export const relativeHumidityFamilies = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]

function temperatureRange(minTemperature: number, maxTemperature: number, temperatureStep: number) {
  const points: number[] = []
  for (let dryBulbC = minTemperature; dryBulbC <= maxTemperature + 0.0001; dryBulbC += temperatureStep) {
    points.push(Number(dryBulbC.toFixed(2)))
  }
  return points
}

function underSaturation(point: ChartPoint, pressurePa: number) {
  const saturation = saturationHumidityRatio(point.x, pressurePa)
  return saturation !== null && point.y <= humidityRatioToGKg(saturation) + 0.01
}

export function generateRelativeHumidityCurve({
  relativeHumidity,
  pressurePa,
  minTemperature = -10,
  maxTemperature = 50,
  temperatureStep = 0.5,
}: ChartGenerationOptions & { relativeHumidity: number }): ChartPoint[] {
  return temperatureRange(minTemperature, maxTemperature, temperatureStep)
    .map((dryBulbC) => {
      const humidityRatio = humidityRatioFromRelativeHumidity(dryBulbC, relativeHumidity, pressurePa)
      return humidityRatio === null ? null : { x: dryBulbC, y: humidityRatioToGKg(humidityRatio) }
    })
    .filter((point): point is ChartPoint => point !== null && isPhysicallyDrawablePoint(point))
}

export function generateSaturationCurve(options: ChartGenerationOptions) {
  return generateRelativeHumidityCurve({ ...options, relativeHumidity: 1 })
}

export function generateEnthalpyLine({ enthalpyKJkg, pressurePa, minTemperature = -10, maxTemperature = 50, temperatureStep = 1 }: ChartGenerationOptions & { enthalpyKJkg: number }): ChartPoint[] {
  return temperatureRange(minTemperature, maxTemperature, temperatureStep)
    .map((dryBulbC) => {
      const humidityRatio = humidityRatioFromEnthalpy(dryBulbC, enthalpyKJkg)
      return humidityRatio === null ? null : { x: dryBulbC, y: humidityRatioToGKg(humidityRatio) }
    })
    .filter((point): point is ChartPoint => point !== null && isPhysicallyDrawablePoint(point) && underSaturation(point, pressurePa))
}

export function generateWetBulbLine({ wetBulbC, pressurePa, maxTemperature = 50, temperatureStep = 1 }: ChartGenerationOptions & { wetBulbC: number }): ChartPoint[] {
  return temperatureRange(wetBulbC, maxTemperature, temperatureStep)
    .map((dryBulbC) => {
      const humidityRatio = humidityRatioFromWetBulb(dryBulbC, wetBulbC, pressurePa)
      return humidityRatio === null ? null : { x: dryBulbC, y: humidityRatioToGKg(humidityRatio) }
    })
    .filter((point): point is ChartPoint => point !== null && isPhysicallyDrawablePoint(point) && underSaturation(point, pressurePa))
}

export function generateSpecificVolumeLine({ specificVolumeM3kg, pressurePa, minTemperature = -10, maxTemperature = 50, temperatureStep = 1 }: ChartGenerationOptions & { specificVolumeM3kg: number }): ChartPoint[] {
  const dryAirGasConstant = 287.055
  return temperatureRange(minTemperature, maxTemperature, temperatureStep)
    .map((dryBulbC) => {
      const dryBulbK = dryBulbC + 273.15
      const humidityRatio = (((specificVolumeM3kg * pressurePa) / (dryAirGasConstant * dryBulbK)) - 1) / 1.607858
      return { x: dryBulbC, y: humidityRatioToGKg(humidityRatio) }
    })
    .filter((point) => isPhysicallyDrawablePoint(point) && underSaturation(point, pressurePa))
}

export function generatePsychrometricCurves(options: ChartGenerationOptions & { advanced?: boolean }) {
  const base = {
    saturation: generateSaturationCurve(options),
    relativeHumidity: relativeHumidityFamilies.map((relativeHumidity) => ({
      relativeHumidity,
      points: generateRelativeHumidityCurve({ ...options, relativeHumidity }),
    })),
  }
  if (!options.advanced) return { ...base, enthalpy: [], wetBulb: [], specificVolume: [] }
  return {
    ...base,
    enthalpy: [10, 20, 30, 40, 50, 60, 70, 80].map((enthalpyKJkg) => ({ enthalpyKJkg, points: generateEnthalpyLine({ ...options, enthalpyKJkg }) })),
    wetBulb: [-5, 0, 5, 10, 15, 20, 25, 30].map((wetBulbC) => ({ wetBulbC, points: generateWetBulbLine({ ...options, wetBulbC }) })),
    specificVolume: [0.78, 0.82, 0.86, 0.9, 0.94].map((specificVolumeM3kg) => ({ specificVolumeM3kg, points: generateSpecificVolumeLine({ ...options, specificVolumeM3kg }) })),
  }
}
