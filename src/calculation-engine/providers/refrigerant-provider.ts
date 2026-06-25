import { refrigerantTables, type RefrigerantTable } from '../../data/generated'
import { refrigerantMetadata } from '../../data/refrigerant-metadata'
import type { CalculationSource } from '../types'

export type RefrigerantSummary = {
  key: string
  name: string
  category: string
  safetyClass: string | null
  tableStatus: 'validated' | 'pending'
}

export interface RefrigerantProvider {
  id: string
  listRefrigerants(): RefrigerantSummary[]
  getTable(refrigerant: string): RefrigerantTable | undefined
  getSource(table: RefrigerantTable): CalculationSource
}

export const generatedRefrigerantProvider: RefrigerantProvider = {
  id: 'generated-json-refrigerant-provider',
  listRefrigerants() {
    return refrigerantTables.map((table) => {
      const meta = refrigerantMetadata[table.refrigerant]
      return {
        key: table.refrigerant,
        name: meta.name,
        category: meta.category,
        safetyClass: meta.safetyClass.value,
        tableStatus: table.generator === 'CoolProp' && table.points.length > 1 ? 'validated' : 'pending',
      }
    })
  },
  getTable(refrigerant) {
    return refrigerantTables.find((table) => table.refrigerant === refrigerant)
  },
  getSource(table) {
    return {
      provider: table.generator === 'CoolProp' ? 'CoolProp generated JSON' : 'Pending generated JSON',
      version: table.coolPropVersion ?? `schema-${table.schemaVersion}`,
      generatedAt: table.generatedAt,
      reviewedAt: refrigerantMetadata[table.refrigerant]?.safetyClass.reviewedAt,
      limitations: table.limitations,
    }
  },
}
