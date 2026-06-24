import { refrigerantTables, type RefrigerantTable } from '../data/generated'
import { maxGlideK } from '../domain/refrigerants/summary'
import { parseLocalizedNumber, type PressureUnit } from '../domain/units'

export const APP_VERSION = '1.1.0-sprint0'
export const appIconUrl = `${import.meta.env.BASE_URL}icons/icon.png`
export const preferredPressureUnits: PressureUnit[] = ['bar', 'PSI', 'kPa', 'MPa']

export const formatNumber = (value: number, digits = 2) => value.toLocaleString('es-ES', { minimumFractionDigits: digits, maximumFractionDigits: digits })

export function parseRequiredNumber(value: string, label: string) {
  const parsed = parseLocalizedNumber(value)
  if (!Number.isFinite(parsed)) throw new Error(`Introduce un valor válido en ${label}.`)
  return parsed
}

export function optionalNumber(value?: string) {
  if (!value?.trim()) return undefined
  const parsed = parseLocalizedNumber(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export function getTable(name: string): RefrigerantTable {
  return refrigerantTables.find((table) => table.refrigerant === name) ?? refrigerantTables[0]
}

export function isZeotropicWithGlide(table: RefrigerantTable) {
  const glide = maxGlideK(table)
  return table.refrigerantType === 'zeotropic' && glide !== null && glide > 0.1
}
