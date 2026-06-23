import type { RefrigerantTable, SaturationPoint } from '../../data/generated/refrigerants'

export type SaturationMode = 'dew' | 'bubble'

function sortedPoints(table: RefrigerantTable): SaturationPoint[] {
  return [...table.points].sort((a, b) => a.pressurePaAbs - b.pressurePaAbs)
}

export function interpolateTemperatureFromPressure(table: RefrigerantTable, pressurePaAbs: number, mode: SaturationMode): number {
  const field = mode === 'dew' ? 'dewC' : 'bubbleC'
  const points = sortedPoints(table).filter((point) => point[field] !== null)
  if (points.length < 2) throw new Error(`No hay suficientes datos ${mode} generados para ${table.refrigerant}.`)
  if (pressurePaAbs < points[0].pressurePaAbs || pressurePaAbs > points[points.length - 1].pressurePaAbs) {
    throw new RangeError('El valor queda fuera del rango termodinámico disponible.')
  }
  const exact = points.find((point) => point.pressurePaAbs === pressurePaAbs)
  if (exact) return exact[field] as number
  const upperIndex = points.findIndex((point) => point.pressurePaAbs > pressurePaAbs)
  const lower = points[upperIndex - 1]
  const upper = points[upperIndex]
  const ratio = (pressurePaAbs - lower.pressurePaAbs) / (upper.pressurePaAbs - lower.pressurePaAbs)
  return (lower[field] as number) + ratio * ((upper[field] as number) - (lower[field] as number))
}

export function interpolatePressureFromTemperature(table: RefrigerantTable, temperatureC: number, mode: SaturationMode): number {
  const field = mode === 'dew' ? 'dewC' : 'bubbleC'
  const points = sortedPoints(table).filter((point) => point[field] !== null).sort((a, b) => (a[field] as number) - (b[field] as number))
  if (points.length < 2) throw new Error(`No hay suficientes datos ${mode} generados para ${table.refrigerant}.`)
  const min = points[0][field] as number
  const max = points[points.length - 1][field] as number
  if (temperatureC < min || temperatureC > max) throw new RangeError('La temperatura queda fuera del rango termodinámico disponible.')
  const exact = points.find((point) => point[field] === temperatureC)
  if (exact) return exact.pressurePaAbs
  const upperIndex = points.findIndex((point) => (point[field] as number) > temperatureC)
  const lower = points[upperIndex - 1]
  const upper = points[upperIndex]
  const ratio = (temperatureC - (lower[field] as number)) / ((upper[field] as number) - (lower[field] as number))
  return lower.pressurePaAbs + ratio * (upper.pressurePaAbs - lower.pressurePaAbs)
}

export function calculateSuperheat(suctionPressurePaAbs: number, measuredSuctionPipeC: number, table: RefrigerantTable): number {
  return measuredSuctionPipeC - interpolateTemperatureFromPressure(table, suctionPressurePaAbs, 'dew')
}

export function calculateSubcooling(highPressurePaAbs: number, measuredLiquidLineC: number, table: RefrigerantTable): number {
  return interpolateTemperatureFromPressure(table, highPressurePaAbs, 'bubble') - measuredLiquidLineC
}
