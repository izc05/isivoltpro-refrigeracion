import { generatedRefrigerantTables } from './coolprop-tables'
import { pendingTables, type RefrigerantTable } from './refrigerants'

export const refrigerantTables: RefrigerantTable[] = pendingTables.map((pending) => generatedRefrigerantTables.find((table) => table.refrigerant === pending.refrigerant) ?? pending)
export type { RefrigerantKey, RefrigerantTable, SaturationPoint } from './refrigerants'
