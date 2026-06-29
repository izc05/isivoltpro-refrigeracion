import { describe, expect, it } from 'vitest'
import { altitudeToAtmospherePa } from '../domain/units'
import { pressureToApproximateAltitudeM, pressureValueForUnit, resolvePsychrometricPressurePa } from '../sprint0/psychrometric-pressure-utils'

describe('psychrometric pressure utilities', () => {
  it('uses the configured pressure in settings mode', () => {
    expect(resolvePsychrometricPressurePa({
      mode: 'settings',
      settingsPressurePa: 95400,
      altitudeInput: '0',
      manualInput: '0',
      manualUnit: 'Pa',
    })).toBe(95400)
  })

  it('converts altitude to pressure and back approximately', () => {
    const pressurePa = altitudeToAtmospherePa(1000)
    expect(pressureToApproximateAltitudeM(pressurePa)).toBeCloseTo(1000, 0)
  })

  it('resolves localized manual pressure units', () => {
    expect(resolvePsychrometricPressurePa({
      mode: 'manual',
      settingsPressurePa: 101325,
      altitudeInput: '0',
      manualInput: '95,4',
      manualUnit: 'kPa',
    })).toBeCloseTo(95400, 6)
  })

  it('formats the same pressure for each supported display unit', () => {
    expect(pressureValueForUnit(101325, 'Pa')).toBe('101325')
    expect(pressureValueForUnit(101325, 'hPa')).toBe('1013.3')
    expect(pressureValueForUnit(101325, 'kPa')).toBe('101.33')
    expect(pressureValueForUnit(101325, 'bar_abs')).toBe('1.0132')
  })

  it('rejects an invalid altitude instead of silently using sea level', () => {
    expect(() => resolvePsychrometricPressurePa({
      mode: 'altitude',
      settingsPressurePa: 101325,
      altitudeInput: '',
      manualInput: '101325',
      manualUnit: 'Pa',
    })).toThrow('Introduce una altitud válida.')
  })
})
