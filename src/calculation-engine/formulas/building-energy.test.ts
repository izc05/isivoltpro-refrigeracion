import { describe, expect, it } from 'vitest'
import { calculateAerothermalSizing, calculateBuildingLoads } from './building-energy'

describe('building energy calculations', () => {
  it('calculates heating, sensible and latent cooling loads', () => {
    const result = calculateBuildingLoads({
      floorAreaM2: 100,
      heightM: 2.6,
      exteriorWallAreaM2: 80,
      windowAreaM2: 18,
      roofAreaM2: 100,
      exposedFloorAreaM2: 0,
      uWallWm2K: 0.6,
      uWindowWm2K: 1.8,
      uRoofWm2K: 0.35,
      uFloorWm2K: 0.5,
      winterOutdoorC: -2,
      winterIndoorC: 21,
      summerOutdoorC: 38,
      summerIndoorC: 25,
      outdoorRelativeHumidityPct: 45,
      indoorRelativeHumidityPct: 50,
      airChangesPerHour: 0.5,
      heatRecoveryEfficiencyPct: 0,
      occupants: 4,
      sensibleWPerPerson: 75,
      latentWPerPerson: 55,
      lightingWm2: 6,
      equipmentW: 600,
      orientation: 'SO',
      glazingSolarFactor: 0.55,
      shadingFactor: 0.8,
      safetyFactorPct: 10,
    })

    expect(result.heating.totalKw).toBeCloseTo(3.748, 2)
    expect(result.cooling.totalKw).toBeCloseTo(9.277, 2)
    expect(result.cooling.frigoriasHour).toBeCloseTo(7977, -1)
    expect(result.cooling.latentW).toBeGreaterThan(0)
    expect(result.cooling.sensibleHeatRatio).toBeGreaterThan(0.8)
    expect(result.cooling.sensibleHeatRatio).toBeLessThan(1)
  })

  it('calculates capacity coverage, ACS, hydraulics and annual consumption', () => {
    const result = calculateAerothermalSizing({
      heatingLoadKw: 8,
      coolingLoadKw: 7,
      safetyFactorPct: 5,
      selectedNominalCapacityKw: 9,
      capacityAtDesignKw: 8,
      minimumModulationKw: 2.2,
      copAtDesign: 3.2,
      scop: 4.5,
      seer: 5.5,
      waterDeltaTK: 5,
      systemVolumeL: 70,
      minimumVolumeLPerKw: 10,
      glycolPct: 0,
      occupants: 4,
      dhwLitresPerPersonDay: 35,
      coldWaterC: 10,
      storageTemperatureC: 50,
      dhwRecoveryHours: 2,
      annualHeatingEquivalentHours: 1200,
      annualCoolingEquivalentHours: 500,
      electricityPriceEurKwh: 0.2,
    })

    expect(result.designHeatingKw).toBeCloseTo(8.4, 3)
    expect(result.capacityCoveragePct).toBeCloseTo(95.238, 2)
    expect(result.backupHeatingKw).toBeCloseTo(0.4, 3)
    expect(result.heatingWaterFlowM3H).toBeCloseTo(1.445, 2)
    expect(result.requiredBufferVolumeL).toBeCloseTo(20, 3)
    expect(result.dhwDailyVolumeL).toBe(140)
    expect(result.dhwDailyEnergyKwh).toBeCloseTo(6.5128, 3)
    expect(result.annualElectricityKwh).toBeGreaterThan(3000)
    expect(result.annualCostEur).toBeGreaterThan(600)
  })
})
