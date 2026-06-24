export type MassUnit = 'g' | 'kg' | 'lb' | 'oz'
export type LengthUnit = 'm' | 'ft'
export type TemperatureUnit = 'C' | 'F'
export type CoolingPowerUnit = 'kW' | 'frig_h' | 'BTU_h'
export type AirflowUnit = 'm3_h' | 'l_s' | 'CFM'

const massToG: Record<MassUnit, number> = { g: 1, kg: 1000, lb: 453.59237, oz: 28.349523125 }
const lengthToM: Record<LengthUnit, number> = { m: 1, ft: 0.3048 }
const powerToKw: Record<CoolingPowerUnit, number> = { kW: 1, frig_h: 0.001163, BTU_h: 0.00029307107 }
const airflowToM3H: Record<AirflowUnit, number> = { m3_h: 1, l_s: 3.6, CFM: 1.69901082 }

export function convertMass(value: number, from: MassUnit, to: MassUnit): number {
  return (value * massToG[from]) / massToG[to]
}

export function convertLength(value: number, from: LengthUnit, to: LengthUnit): number {
  return (value * lengthToM[from]) / lengthToM[to]
}

export function convertTemperature(value: number, from: TemperatureUnit, to: TemperatureUnit): number {
  if (from === to) return value
  return from === 'C' ? (value * 9) / 5 + 32 : ((value - 32) * 5) / 9
}

export function convertCoolingPower(value: number, from: CoolingPowerUnit, to: CoolingPowerUnit): number {
  return (value * powerToKw[from]) / powerToKw[to]
}

export function convertAirflow(value: number, from: AirflowUnit, to: AirflowUnit): number {
  return (value * airflowToM3H[from]) / airflowToM3H[to]
}

export function singlePhaseCurrent(powerKw: number, voltage: number, powerFactor: number): number {
  const watts = powerKw * 1000
  return watts / (voltage * powerFactor)
}

export function threePhaseCurrent(powerKw: number, voltage: number, powerFactor: number): number {
  const watts = powerKw * 1000
  return watts / (Math.sqrt(3) * voltage * powerFactor)
}

export function eerFromCop(cop: number): number {
  return cop * 3.412141633
}

export function copFromEer(eer: number): number {
  return eer / 3.412141633
}
