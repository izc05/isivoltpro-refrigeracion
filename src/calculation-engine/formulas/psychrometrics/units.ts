export type PsychrometricPressureUnit = 'Pa' | 'hPa' | 'mbar' | 'kPa' | 'bar_abs'

export const recommendedPressureRangePa = { min: 50000, max: 110000 }

export function psychrometricPressureToPa(value: number, unit: PsychrometricPressureUnit) {
  if (!Number.isFinite(value) || value <= 0) throw new Error('Introduce una presión atmosférica positiva.')
  switch (unit) {
    case 'Pa': return value
    case 'hPa':
    case 'mbar': return value * 100
    case 'kPa': return value * 1000
    case 'bar_abs': return value * 100000
  }
}

export function pressureRangeWarning(pressurePa: number) {
  if (pressurePa < recommendedPressureRangePa.min || pressurePa > recommendedPressureRangePa.max) {
    return 'Presión atmosférica fuera del rango recomendado 50.000-110.000 Pa. Revisa altitud, unidad o instrumento antes de interpretar.'
  }
  return null
}
