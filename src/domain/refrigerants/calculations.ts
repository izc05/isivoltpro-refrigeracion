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

export type ThermalIndicator = {
  label: 'Bajo' | 'Normal' | 'Elevado'
  tone: 'low' | 'normal' | 'high'
  explanation: string
  checks: string[]
}

export function evaluateSuperheat(superheatK: number): ThermalIndicator {
  if (superheatK < 3) {
    return {
      label: 'Bajo',
      tone: 'low',
      explanation: 'Recalentamiento bajo. Puede indicar evaporador muy alimentado, caudal de aire bajo o medición inestable.',
      checks: ['Comprobar caudal de aire', 'Verificar sonda de temperatura', 'Contrastar con subenfriamiento'],
    }
  }
  if (superheatK > 12) {
    return {
      label: 'Elevado',
      tone: 'high',
      explanation: 'Recalentamiento elevado. Es una señal orientativa, no una orden de añadir refrigerante.',
      checks: ['Comprobar caudal de aire', 'Comprobar restricción', 'Verificar carga por peso y fabricante'],
    }
  }
  return {
    label: 'Normal',
    tone: 'normal',
    explanation: 'Recalentamiento dentro de una zona orientativa habitual. Confirmar siempre con el comportamiento completo del equipo.',
    checks: ['Contrastar con subenfriamiento', 'Revisar condiciones de trabajo', 'Comparar con datos del fabricante'],
  }
}

export function evaluateSubcooling(subcoolingK: number): ThermalIndicator {
  if (subcoolingK < 3) {
    return {
      label: 'Bajo',
      tone: 'low',
      explanation: 'Subenfriamiento bajo. Puede apuntar a alimentación insuficiente de líquido, falta de carga o condiciones de condensación bajas.',
      checks: ['Verificar carga por peso', 'Comprobar condensación', 'Revisar presencia de burbujas/restricciones'],
    }
  }
  if (subcoolingK > 12) {
    return {
      label: 'Elevado',
      tone: 'high',
      explanation: 'Subenfriamiento elevado. Puede asociarse a exceso de carga, restricción o condensador trabajando fuera de rango.',
      checks: ['Comprobar condensador', 'Comprobar restricción', 'Comparar con documentación del fabricante'],
    }
  }
  return {
    label: 'Normal',
    tone: 'normal',
    explanation: 'Subenfriamiento dentro de una zona orientativa habitual. Debe validarse con el equipo y refrigerante concretos.',
    checks: ['Contrastar con recalentamiento', 'Verificar temperatura exterior', 'Comparar con datos del fabricante'],
  }
}
