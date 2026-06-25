declare module 'psychrolib' {
  type PsychroTuple = [number, number, number, number, number, number, number]

  const psychrolib: {
    IP: 1
    SI: 2
    SetUnitSystem(unitSystem: 1 | 2): void
    CalcPsychrometricsFromRelHum(dryBulbTemperature: number, relativeHumidity: number, pressure: number): PsychroTuple
    GetStandardAtmPressure(altitude: number): number
  }

  export default psychrolib
}
