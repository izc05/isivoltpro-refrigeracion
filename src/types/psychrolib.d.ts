declare module 'psychrolib' {
  type PsychroTuple = [number, number, number, number, number, number, number]

  const psychrolib: {
    IP: 1
    SI: 2
    SetUnitSystem(unitSystem: 1 | 2): void
    CalcPsychrometricsFromRelHum(dryBulbTemperature: number, relativeHumidity: number, pressure: number): PsychroTuple
    CalcPsychrometricsFromTDewPoint(dryBulbTemperature: number, dewPointTemperature: number, pressure: number): PsychroTuple
    CalcPsychrometricsFromTWetBulb(dryBulbTemperature: number, wetBulbTemperature: number, pressure: number): PsychroTuple
    GetHumRatioFromRelHum(dryBulbTemperature: number, relativeHumidity: number, pressure: number): number
    GetHumRatioFromTWetBulb(dryBulbTemperature: number, wetBulbTemperature: number, pressure: number): number
    GetHumRatioFromTDewPoint(dewPointTemperature: number, pressure: number): number
    GetHumRatioFromVapPres(vaporPressure: number, pressure: number): number
    GetTWetBulbFromHumRatio(dryBulbTemperature: number, humidityRatio: number, pressure: number): number
    GetTDewPointFromHumRatio(dryBulbTemperature: number, humidityRatio: number, pressure: number): number
    GetRelHumFromHumRatio(dryBulbTemperature: number, humidityRatio: number, pressure: number): number
    GetVapPresFromHumRatio(humidityRatio: number, pressure: number): number
    GetSatVapPres(dryBulbTemperature: number): number
    GetMoistAirEnthalpy(dryBulbTemperature: number, humidityRatio: number): number
    GetMoistAirVolume(dryBulbTemperature: number, humidityRatio: number, pressure: number): number
    GetMoistAirDensity(dryBulbTemperature: number, humidityRatio: number, pressure: number): number
    GetDegreeOfSaturation(dryBulbTemperature: number, humidityRatio: number, pressure: number): number
    GetStandardAtmPressure(altitude: number): number
  }

  export default psychrolib
}
