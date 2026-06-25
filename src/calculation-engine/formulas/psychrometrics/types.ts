export type PsychrometricState = {
  dryBulbC: number
  relativeHumidityPct: number
  wetBulbC: number
  dewPointC: number
  humidityRatioKgKg: number
  humidityRatioGKg: number
  absoluteHumidityGM3: number
  vaporPressurePa: number
  saturationVaporPressurePa: number
  vaporPressureDeficitPa: number
  moistAirEnthalpyKJkg: number
  moistAirVolumeM3kg: number
  moistAirDensityKgM3: number
  degreeOfSaturationPct: number
  dewPointSpreadK: number
  pressurePa: number
}

export type PsychrometricsResult = PsychrometricState

export type PsychrometricChartPoint = {
  id: string
  label: string
  dryBulbC: number
  humidityRatioGKg: number
  relativeHumidityPct: number
  dewPointC: number
  enthalpyKJkg: number
}

export type CondensationRiskLevel = 'high' | 'preventive' | 'none'

export type CondensationRiskResult = {
  state: PsychrometricState
  surfaceTempC: number
  safetyMarginK: number
  surfaceMarginK: number
  safeSurfaceTempC: number
  risk: CondensationRiskLevel
  title: string
  summary: string
  recommendedChecks: string[]
}

export type PsychrometricProcessType =
  | 'sensible-heating'
  | 'sensible-cooling'
  | 'cooling-dehumidification'
  | 'heating-humidification'
  | 'cooling-humidification'
  | 'heating-dehumidification'
  | 'stable'
  | 'mixed'

export type PsychrometricComparisonResult = {
  a: PsychrometricState
  b: PsychrometricState
  deltas: {
    dryBulbC: number
    relativeHumidityPct: number
    dewPointC: number
    humidityRatioGKg: number
    absoluteHumidityGM3: number
    moistAirEnthalpyKJkg: number
    moistAirVolumeM3kg: number
  }
  processType: PsychrometricProcessType
  processLabel: string
  summary: string
}
