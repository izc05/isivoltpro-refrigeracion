import type { RefrigerantTable } from '../../data/generated'
import { interpolatePressureFromTemperature } from './calculations'

export function maxGlideK(table: RefrigerantTable): number | null {
  const glides = table.points
    .filter((point) => point.bubbleC !== null && point.dewC !== null)
    .map((point) => Math.abs((point.dewC as number) - (point.bubbleC as number)))
  if (glides.length === 0) return null
  return Math.max(...glides)
}

export function tableStatusLabel(table: RefrigerantTable): string {
  if (table.generator !== 'CoolProp') return 'Pendiente de validación'
  return `${table.points.length} puntos · CoolProp ${table.coolPropVersion}`
}

export function formatRange(table: RefrigerantTable): string {
  if (table.validRange.minC === null || table.validRange.maxC === null) return 'Rango pendiente'
  return `${table.validRange.minC.toFixed(0)} a ${table.validRange.maxC.toFixed(0)} °C`
}

export function commonPressureRows(table: RefrigerantTable, temperaturesC = [-10, 0, 5, 10, 20, 35]) {
  return temperaturesC.map((temperatureC) => {
    try {
      return {
        temperatureC,
        dewPressurePaAbs: interpolatePressureFromTemperature(table, temperatureC, 'dew'),
        bubblePressurePaAbs: interpolatePressureFromTemperature(table, temperatureC, 'bubble'),
      }
    } catch {
      return { temperatureC, dewPressurePaAbs: null, bubblePressurePaAbs: null }
    }
  })
}
