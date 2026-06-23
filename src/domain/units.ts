export type PressureUnit = 'Pa' | 'kPa' | 'MPa' | 'bar' | 'PSI' | 'kgf/cm2' | 'atm'
export type VacuumUnit = 'micron' | 'Pa_abs' | 'mbar_abs' | 'Torr' | 'mmHg' | 'inHg' | 'bar_abs'
export type PressureKind = 'absolute' | 'gauge'
export const DEFAULT_ATMOSPHERE_PA = 101325

const pressureToPa: Record<PressureUnit, number> = {
  Pa: 1,
  kPa: 1000,
  MPa: 1_000_000,
  bar: 100000,
  PSI: 6894.757293168,
  'kgf/cm2': 98066.5,
  atm: DEFAULT_ATMOSPHERE_PA,
}

const vacuumToPa: Record<VacuumUnit, number> = {
  micron: 0.133322368,
  Pa_abs: 1,
  mbar_abs: 100,
  Torr: 133.322368,
  mmHg: 133.322368,
  inHg: 3386.38816,
  bar_abs: 100000,
}

export function parseLocalizedNumber(input: string | number): number {
  if (typeof input === 'number') return input
  const normalized = input.trim().replace(/\s/g, '').replace(',', '.')
  if (!normalized) return Number.NaN
  return Number(normalized)
}

export function pressureToPaAbsolute(value: number, unit: PressureUnit, kind: PressureKind, atmospherePa = DEFAULT_ATMOSPHERE_PA): number {
  const pa = value * pressureToPa[unit]
  const absolute = kind === 'absolute' ? pa : pa + atmospherePa
  if (!Number.isFinite(absolute) || absolute <= 0) throw new RangeError('La presión absoluta debe ser mayor que cero.')
  return absolute
}

export function paAbsoluteToPressure(paAbs: number, unit: PressureUnit, kind: PressureKind, atmospherePa = DEFAULT_ATMOSPHERE_PA): number {
  if (!Number.isFinite(paAbs) || paAbs <= 0) throw new RangeError('La presión absoluta debe ser mayor que cero.')
  const pa = kind === 'absolute' ? paAbs : paAbs - atmospherePa
  return pa / pressureToPa[unit]
}

export function convertPressure(value: number, from: PressureUnit, to: PressureUnit): number {
  return (value * pressureToPa[from]) / pressureToPa[to]
}

export function vacuumToPaAbsolute(value: number, unit: VacuumUnit): number {
  const pa = value * vacuumToPa[unit]
  if (!Number.isFinite(pa) || pa < 0) throw new RangeError('El vacío absoluto no puede ser negativo.')
  return pa
}

export function paAbsoluteToVacuum(paAbs: number, unit: VacuumUnit): number {
  if (!Number.isFinite(paAbs) || paAbs < 0) throw new RangeError('El vacío absoluto no puede ser negativo.')
  return paAbs / vacuumToPa[unit]
}

export function altitudeToAtmospherePa(altitudeM: number): number {
  if (!Number.isFinite(altitudeM)) return DEFAULT_ATMOSPHERE_PA
  return DEFAULT_ATMOSPHERE_PA * Math.pow(1 - (2.25577e-5 * altitudeM), 5.25588)
}

export function formatPressureLabel(unit: PressureUnit, kind: PressureKind): string {
  if (unit === 'bar') return kind === 'absolute' ? 'bar(a)' : 'bar(g)'
  if (unit === 'PSI') return kind === 'absolute' ? 'PSI(a)' : 'PSI(g)'
  return `${unit}${kind === 'absolute' ? '(a)' : '(g)'}`
}
