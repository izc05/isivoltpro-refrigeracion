import { psychrometricPressureToPa, type PsychrometricPressureUnit } from '../calculation-engine/formulas/psychrometrics'
import { altitudeToAtmospherePa, parseLocalizedNumber } from '../domain/units'
import type { PsychrometricPressureMode } from './psychrometric-pressure-control'

export function pressureToApproximateAltitudeM(pressurePa: number) {
  if (!Number.isFinite(pressurePa) || pressurePa <= 0) return Number.NaN
  return (1 - Math.pow(pressurePa / 101325, 1 / 5.25588)) / 2.25577e-5
}

export function pressureValueForUnit(pressurePa: number, unit: PsychrometricPressureUnit) {
  if (!Number.isFinite(pressurePa)) return ''
  if (unit === 'Pa') return pressurePa.toFixed(0)
  if (unit === 'hPa' || unit === 'mbar') return (pressurePa / 100).toFixed(1)
  if (unit === 'kPa') return (pressurePa / 1000).toFixed(2)
  return (pressurePa / 100000).toFixed(4)
}

export function resolvePsychrometricPressurePa(input: {
  mode: PsychrometricPressureMode
  settingsPressurePa: number
  altitudeInput: string
  manualInput: string
  manualUnit: PsychrometricPressureUnit
}) {
  if (input.mode === 'settings') return input.settingsPressurePa
  if (input.mode === 'altitude') {
    const altitudeM = parseLocalizedNumber(input.altitudeInput)
    if (!Number.isFinite(altitudeM)) throw new Error('Introduce una altitud válida.')
    return altitudeToAtmospherePa(altitudeM)
  }
  return psychrometricPressureToPa(parseLocalizedNumber(input.manualInput), input.manualUnit)
}
