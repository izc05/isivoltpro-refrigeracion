export type Orientation = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SO' | 'O' | 'NO'

export type BuildingLoadInput = {
  floorAreaM2: number
  heightM: number
  exteriorWallAreaM2: number
  windowAreaM2: number
  roofAreaM2: number
  exposedFloorAreaM2: number
  uWallWm2K: number
  uWindowWm2K: number
  uRoofWm2K: number
  uFloorWm2K: number
  winterOutdoorC: number
  winterIndoorC: number
  summerOutdoorC: number
  summerIndoorC: number
  outdoorRelativeHumidityPct: number
  indoorRelativeHumidityPct: number
  airChangesPerHour: number
  heatRecoveryEfficiencyPct: number
  occupants: number
  sensibleWPerPerson: number
  latentWPerPerson: number
  lightingWm2: number
  equipmentW: number
  orientation: Orientation
  glazingSolarFactor: number
  shadingFactor: number
  safetyFactorPct: number
}

export type BuildingLoadResult = {
  volumeM3: number
  ventilationM3H: number
  heating: {
    wallsW: number
    windowsW: number
    roofW: number
    floorW: number
    ventilationW: number
    transmissionW: number
    totalW: number
    totalKw: number
  }
  cooling: {
    wallsW: number
    windowsTransmissionW: number
    roofW: number
    floorW: number
    solarW: number
    ventilationSensibleW: number
    ventilationLatentW: number
    peopleSensibleW: number
    peopleLatentW: number
    lightingW: number
    equipmentW: number
    sensibleW: number
    latentW: number
    totalW: number
    totalKw: number
    frigoriasHour: number
    btuHour: number
    sensibleHeatRatio: number
    recommendedAirflowM3H: number
    condensateLitresHour: number
  }
}

export type AerothermalSizingInput = {
  heatingLoadKw: number
  coolingLoadKw: number
  safetyFactorPct: number
  selectedNominalCapacityKw: number
  capacityAtDesignKw: number
  minimumModulationKw: number
  copAtDesign: number
  scop: number
  seer: number
  waterDeltaTK: number
  systemVolumeL: number
  minimumVolumeLPerKw: number
  glycolPct: number
  occupants: number
  dhwLitresPerPersonDay: number
  coldWaterC: number
  storageTemperatureC: number
  dhwRecoveryHours: number
  annualHeatingEquivalentHours: number
  annualCoolingEquivalentHours: number
  electricityPriceEurKwh: number
}

export type AerothermalSizingResult = {
  designHeatingKw: number
  designCoolingKw: number
  recommendedCapacityKw: number
  capacityCoveragePct: number
  backupHeatingKw: number
  modulationRatio: number
  shortCyclingRisk: 'bajo' | 'medio' | 'alto'
  heatingWaterFlowM3H: number
  coolingWaterFlowM3H: number
  requiredBufferVolumeL: number
  expansionVesselApproxL: number
  dhwDailyVolumeL: number
  dhwDailyEnergyKwh: number
  dhwRecoveryPowerKw: number
  annualHeatingThermalKwh: number
  annualCoolingThermalKwh: number
  annualDhwThermalKwh: number
  annualElectricityKwh: number
  annualCostEur: number
  peakElectricalInputKw: number
  singlePhaseCurrentA: number
  threePhaseCurrentA: number
}

const AIR_DENSITY_KG_M3 = 1.2
const AIR_CP_J_KG_K = 1005
const WATER_FACTOR_KW_PER_M3H_K = 1.163
const LATENT_HEAT_WATER_J_KG = 2_501_000
const STANDARD_PRESSURE_PA = 101_325

const orientationIrradianceWm2: Record<Orientation, number> = {
  N: 120,
  NE: 220,
  E: 360,
  SE: 430,
  S: 390,
  SO: 470,
  O: 520,
  NO: 260,
}

function assertPositive(value: number, label: string, allowZero = false) {
  if (!Number.isFinite(value) || (allowZero ? value < 0 : value <= 0)) throw new Error(`Revisa ${label}.`)
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function saturationPressurePa(temperatureC: number) {
  return 610.94 * Math.exp((17.625 * temperatureC) / (temperatureC + 243.04))
}

function humidityRatioKgKg(temperatureC: number, relativeHumidityPct: number) {
  const partialPressure = saturationPressurePa(temperatureC) * clamp(relativeHumidityPct, 0, 100) / 100
  return 0.62198 * partialPressure / Math.max(1, STANDARD_PRESSURE_PA - partialPressure)
}

function transmission(uValue: number, areaM2: number, deltaTK: number) {
  return Math.max(0, uValue) * Math.max(0, areaM2) * Math.max(0, deltaTK)
}

export function calculateBuildingLoads(input: BuildingLoadInput): BuildingLoadResult {
  assertPositive(input.floorAreaM2, 'la superficie')
  assertPositive(input.heightM, 'la altura')
  assertPositive(input.exteriorWallAreaM2, 'la superficie de muros', true)
  assertPositive(input.windowAreaM2, 'la superficie de ventanas', true)
  assertPositive(input.airChangesPerHour, 'las renovaciones de aire', true)
  assertPositive(input.occupants, 'los ocupantes', true)

  const opaqueWallAreaM2 = Math.max(0, input.exteriorWallAreaM2 - input.windowAreaM2)
  const volumeM3 = input.floorAreaM2 * input.heightM
  const ventilationM3H = volumeM3 * input.airChangesPerHour
  const heatRecovery = clamp(input.heatRecoveryEfficiencyPct, 0, 95) / 100
  const winterDeltaK = Math.max(0, input.winterIndoorC - input.winterOutdoorC)
  const summerDeltaK = Math.max(0, input.summerOutdoorC - input.summerIndoorC)
  const margin = 1 + clamp(input.safetyFactorPct, 0, 50) / 100

  const heatingWallsW = transmission(input.uWallWm2K, opaqueWallAreaM2, winterDeltaK)
  const heatingWindowsW = transmission(input.uWindowWm2K, input.windowAreaM2, winterDeltaK)
  const heatingRoofW = transmission(input.uRoofWm2K, input.roofAreaM2, winterDeltaK)
  const heatingFloorW = transmission(input.uFloorWm2K, input.exposedFloorAreaM2, winterDeltaK * 0.55)
  const heatingVentilationW = AIR_DENSITY_KG_M3 * AIR_CP_J_KG_K * (ventilationM3H / 3600) * winterDeltaK * (1 - heatRecovery)
  const heatingTransmissionW = heatingWallsW + heatingWindowsW + heatingRoofW + heatingFloorW
  const heatingTotalW = (heatingTransmissionW + heatingVentilationW) * margin

  const coolingWallsW = transmission(input.uWallWm2K, opaqueWallAreaM2, summerDeltaK)
  const coolingWindowsTransmissionW = transmission(input.uWindowWm2K, input.windowAreaM2, summerDeltaK)
  const coolingRoofW = transmission(input.uRoofWm2K, input.roofAreaM2, summerDeltaK * 1.2)
  const coolingFloorW = transmission(input.uFloorWm2K, input.exposedFloorAreaM2, summerDeltaK * 0.25)
  const solarW = input.windowAreaM2 * orientationIrradianceWm2[input.orientation] * clamp(input.glazingSolarFactor, 0, 1) * clamp(input.shadingFactor, 0, 1)
  const ventilationSensibleW = AIR_DENSITY_KG_M3 * AIR_CP_J_KG_K * (ventilationM3H / 3600) * summerDeltaK * (1 - heatRecovery)

  const outdoorHumidityRatio = humidityRatioKgKg(input.summerOutdoorC, input.outdoorRelativeHumidityPct)
  const indoorHumidityRatio = humidityRatioKgKg(input.summerIndoorC, input.indoorRelativeHumidityPct)
  const dryAirMassFlowKgS = AIR_DENSITY_KG_M3 * ventilationM3H / 3600
  const ventilationLatentW = dryAirMassFlowKgS * Math.max(0, outdoorHumidityRatio - indoorHumidityRatio) * LATENT_HEAT_WATER_J_KG * (1 - heatRecovery)
  const peopleSensibleW = input.occupants * Math.max(0, input.sensibleWPerPerson)
  const peopleLatentW = input.occupants * Math.max(0, input.latentWPerPerson)
  const lightingW = input.floorAreaM2 * Math.max(0, input.lightingWm2)
  const equipmentW = Math.max(0, input.equipmentW)

  const sensibleBeforeMarginW = coolingWallsW + coolingWindowsTransmissionW + coolingRoofW + coolingFloorW + solarW + ventilationSensibleW + peopleSensibleW + lightingW + equipmentW
  const latentBeforeMarginW = ventilationLatentW + peopleLatentW
  const coolingSensibleW = sensibleBeforeMarginW * margin
  const coolingLatentW = latentBeforeMarginW * margin
  const coolingTotalW = coolingSensibleW + coolingLatentW
  const sensibleHeatRatio = coolingTotalW > 0 ? coolingSensibleW / coolingTotalW : 1
  const recommendedAirflowM3H = coolingSensibleW > 0 ? coolingSensibleW / (AIR_DENSITY_KG_M3 * AIR_CP_J_KG_K * 8) * 3600 : 0
  const condensateLitresHour = coolingLatentW / LATENT_HEAT_WATER_J_KG * 3600

  return {
    volumeM3,
    ventilationM3H,
    heating: {
      wallsW: heatingWallsW,
      windowsW: heatingWindowsW,
      roofW: heatingRoofW,
      floorW: heatingFloorW,
      ventilationW: heatingVentilationW,
      transmissionW: heatingTransmissionW,
      totalW: heatingTotalW,
      totalKw: heatingTotalW / 1000,
    },
    cooling: {
      wallsW: coolingWallsW,
      windowsTransmissionW: coolingWindowsTransmissionW,
      roofW: coolingRoofW,
      floorW: coolingFloorW,
      solarW,
      ventilationSensibleW,
      ventilationLatentW,
      peopleSensibleW,
      peopleLatentW,
      lightingW,
      equipmentW,
      sensibleW: coolingSensibleW,
      latentW: coolingLatentW,
      totalW: coolingTotalW,
      totalKw: coolingTotalW / 1000,
      frigoriasHour: coolingTotalW * 0.859845,
      btuHour: coolingTotalW * 3.412142,
      sensibleHeatRatio,
      recommendedAirflowM3H,
      condensateLitresHour,
    },
  }
}

export function calculateAerothermalSizing(input: AerothermalSizingInput): AerothermalSizingResult {
  assertPositive(input.heatingLoadKw, 'la carga de calefacción', true)
  assertPositive(input.coolingLoadKw, 'la carga de refrigeración', true)
  assertPositive(input.selectedNominalCapacityKw, 'la potencia nominal seleccionada')
  assertPositive(input.capacityAtDesignKw, 'la potencia disponible a diseño')
  assertPositive(input.copAtDesign, 'el COP')
  assertPositive(input.scop, 'el SCOP')
  assertPositive(input.seer, 'el SEER')
  assertPositive(input.waterDeltaTK, 'el salto térmico de agua')
  assertPositive(input.dhwRecoveryHours, 'el tiempo de recuperación de ACS')

  const margin = 1 + clamp(input.safetyFactorPct, 0, 40) / 100
  const designHeatingKw = input.heatingLoadKw * margin
  const designCoolingKw = input.coolingLoadKw * margin
  const recommendedCapacityKw = Math.max(designHeatingKw, designCoolingKw)
  const capacityCoveragePct = designHeatingKw > 0 ? input.capacityAtDesignKw / designHeatingKw * 100 : 100
  const backupHeatingKw = Math.max(0, designHeatingKw - input.capacityAtDesignKw)
  const modulationRatio = input.minimumModulationKw / Math.max(0.1, designHeatingKw)
  const shortCyclingRisk: AerothermalSizingResult['shortCyclingRisk'] = modulationRatio <= 0.25 ? 'bajo' : modulationRatio <= 0.45 ? 'medio' : 'alto'

  const heatingWaterFlowM3H = designHeatingKw / (WATER_FACTOR_KW_PER_M3H_K * input.waterDeltaTK)
  const coolingWaterFlowM3H = designCoolingKw / (WATER_FACTOR_KW_PER_M3H_K * input.waterDeltaTK)
  const requiredSystemVolumeL = input.minimumVolumeLPerKw * input.selectedNominalCapacityKw
  const requiredBufferVolumeL = Math.max(0, requiredSystemVolumeL - input.systemVolumeL)
  const expansionFraction = 0.06 + clamp(input.glycolPct, 0, 50) * 0.001
  const expansionVesselApproxL = (input.systemVolumeL + requiredBufferVolumeL) * expansionFraction

  const dhwDailyVolumeL = Math.max(0, input.occupants) * Math.max(0, input.dhwLitresPerPersonDay)
  const dhwDeltaK = Math.max(0, input.storageTemperatureC - input.coldWaterC)
  const dhwDailyEnergyKwh = dhwDailyVolumeL * 1.163 * dhwDeltaK / 1000
  const dhwRecoveryPowerKw = dhwDailyEnergyKwh / input.dhwRecoveryHours

  const annualHeatingThermalKwh = input.heatingLoadKw * Math.max(0, input.annualHeatingEquivalentHours)
  const annualCoolingThermalKwh = input.coolingLoadKw * Math.max(0, input.annualCoolingEquivalentHours)
  const annualDhwThermalKwh = dhwDailyEnergyKwh * 365
  const annualElectricityKwh = annualHeatingThermalKwh / input.scop + annualCoolingThermalKwh / input.seer + annualDhwThermalKwh / input.copAtDesign
  const annualCostEur = annualElectricityKwh * Math.max(0, input.electricityPriceEurKwh)

  const compressorElectricalKw = input.selectedNominalCapacityKw / input.copAtDesign
  const peakElectricalInputKw = compressorElectricalKw + backupHeatingKw
  const singlePhaseCurrentA = peakElectricalInputKw * 1000 / (230 * 0.95)
  const threePhaseCurrentA = peakElectricalInputKw * 1000 / (Math.sqrt(3) * 400 * 0.95)

  return {
    designHeatingKw,
    designCoolingKw,
    recommendedCapacityKw,
    capacityCoveragePct,
    backupHeatingKw,
    modulationRatio,
    shortCyclingRisk,
    heatingWaterFlowM3H,
    coolingWaterFlowM3H,
    requiredBufferVolumeL,
    expansionVesselApproxL,
    dhwDailyVolumeL,
    dhwDailyEnergyKwh,
    dhwRecoveryPowerKw,
    annualHeatingThermalKwh,
    annualCoolingThermalKwh,
    annualDhwThermalKwh,
    annualElectricityKwh,
    annualCostEur,
    peakElectricalInputKw,
    singlePhaseCurrentA,
    threePhaseCurrentA,
  }
}
