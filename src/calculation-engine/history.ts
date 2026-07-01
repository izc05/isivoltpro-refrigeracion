import { db, newId, type CalculationHistoryRecord } from '../domain/storage/db'
import type { CalculationEnvelope } from './types'

export type SaveCalculationOptions = {
  equipmentId?: string
  interventionId?: string
  reportId?: string
}

export async function saveCalculationHistory(calculation: CalculationEnvelope<unknown, unknown>, options: SaveCalculationOptions = {}) {
  const record: CalculationHistoryRecord = {
    id: newId('calc'),
    module: calculation.module,
    calculator: calculation.calculator,
    refrigerant: typeof calculation.inputs === 'object' && calculation.inputs && 'refrigerant' in calculation.inputs ? String(calculation.inputs.refrigerant) : undefined,
    equipmentId: options.equipmentId,
    interventionId: options.interventionId,
    reportId: options.reportId,
    createdAt: calculation.calculatedAt,
    sourceProvider: calculation.source.provider,
    sourceVersion: calculation.source.version,
    payload: calculation,
  }
  await db.calculationHistory.put(record)
  return record
}

export function listRecentCalculationHistory(limit = 20, calculator?: string) {
  const query = db.calculationHistory.orderBy('createdAt').reverse()
  return query.toArray().then((records) => records.filter((record) => !calculator || record.calculator === calculator).slice(0, limit))
}

export async function deleteCalculationHistory(id: string) {
  await db.calculationHistory.delete(id)
}

export async function clearCalculationHistoryByCalculators(calculators: string[]) {
  const records = await db.calculationHistory.where('calculator').anyOf(calculators).toArray()
  await db.calculationHistory.bulkDelete(records.map((record) => record.id))
}
