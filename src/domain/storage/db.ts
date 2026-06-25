import Dexie, { type EntityTable } from 'dexie'

export type Client = {
  id: string
  name: string
  phone?: string
  email?: string
  address?: string
}

export type Installation = {
  id: string
  clientId: string
  name: string
  address?: string
  notes?: string
}

export type Equipment = {
  id: string
  installationId: string
  brand?: string
  model?: string
  serialNumber?: string
  refrigerant?: string
  plateCharge?: string
  power?: string
  platePhoto?: string
  observations?: string
}

export type Intervention = {
  id: string
  date: string
  technician?: string
  clientName: string
  installationName?: string
  equipmentLabel?: string
  refrigerant?: string
  workType: string
  status: 'borrador' | 'terminada'
  initialMeasurements?: string
  finalMeasurements?: string
  recoveredRefrigerant?: string
  addedRefrigerant?: string
  finalVacuum?: string
  vacuumTestDuration?: string
  leakTest?: string
  temperatures?: string
  pressures?: string
  superheatK?: number
  subcoolingK?: number
  consumption?: string
  materials?: string
  diagnosis?: string
  observations?: string
  conclusion?: string
  photos: string[]
  signature?: string
  completedAt?: string
  createdAt: string
  updatedAt: string
}

export type VisualResourceType = 'real-photo' | 'annotated-photo' | 'technical-diagram' | 'step-by-step' | 'correct-incorrect' | 'interactive-diagram' | 'chart'

export type VisualAnnotation = {
  id: string
  xPct: number
  yPct: number
  label: string
  description?: string
  field?: string
}

export type VisualResource = {
  id: string
  module: string
  calculator: string
  type: VisualResourceType
  title: string
  description: string
  imagePath: string
  thumbnailPath?: string
  altText: string
  tags: string[]
  source: string
  sourceUrl?: string
  license: string
  version: string
  annotations: VisualAnnotation[]
  relatedFields: string[]
  relatedCalculations: string[]
  active: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}
export type CalculationHistoryRecord = {
  id: string
  module: string
  calculator: string
  refrigerant?: string
  equipmentId?: string
  interventionId?: string
  reportId?: string
  createdAt: string
  sourceProvider: string
  sourceVersion: string
  payload: unknown
}

export class IsiVoltDb extends Dexie {
  clients!: EntityTable<Client, 'id'>
  installations!: EntityTable<Installation, 'id'>
  equipment!: EntityTable<Equipment, 'id'>
  interventions!: EntityTable<Intervention, 'id'>
  calculationHistory!: EntityTable<CalculationHistoryRecord, 'id'>
  visualResources!: EntityTable<VisualResource, 'id'>

  constructor() {
    super('isivoltpro-refrigeracion')

    this.version(1).stores({
      clients: 'id, name',
      installations: 'id, clientId, name',
      equipment: 'id, installationId, refrigerant',
      interventions: 'id, date, clientName, workType, status, updatedAt',
    })

    this.version(2).stores({
      clients: 'id, name',
      installations: 'id, clientId, name',
      equipment: 'id, installationId, refrigerant, serialNumber',
      interventions: 'id, date, clientName, installationName, equipmentLabel, refrigerant, workType, status, updatedAt',
    })

    this.version(3).stores({
      clients: 'id, name',
      installations: 'id, clientId, name',
      equipment: 'id, installationId, refrigerant, serialNumber',
      interventions: 'id, date, clientName, installationName, equipmentLabel, refrigerant, workType, status, updatedAt',
      calculationHistory: 'id, module, calculator, refrigerant, equipmentId, interventionId, reportId, createdAt',
    })

    this.version(4).stores({
      clients: 'id, name',
      installations: 'id, clientId, name',
      equipment: 'id, installationId, refrigerant, serialNumber',
      interventions: 'id, date, clientName, installationName, equipmentLabel, refrigerant, workType, status, updatedAt',
      calculationHistory: 'id, module, calculator, refrigerant, equipmentId, interventionId, reportId, createdAt',
      visualResources: 'id, module, calculator, type, active, sortOrder, updatedAt',
    })
  }
}

export const db = new IsiVoltDb()

export function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`
}

export async function exportBackup() {
  return {
    schemaVersion: 4,
    app: 'IsiVoltPro Refrigeración',
    exportedAt: new Date().toISOString(),
    clients: await db.clients.toArray(),
    installations: await db.installations.toArray(),
    equipment: await db.equipment.toArray(),
    interventions: await db.interventions.toArray(),
    calculationHistory: await db.calculationHistory.toArray(),
    visualResources: await db.visualResources.toArray(),
  }
}

export type IsiVoltBackup = Awaited<ReturnType<typeof exportBackup>>

export async function importBackup(data: Partial<IsiVoltBackup>) {
  if (!data || typeof data !== 'object') throw new TypeError('La copia de seguridad no es válida.')

  await db.transaction('rw', [db.clients, db.installations, db.equipment, db.interventions, db.calculationHistory, db.visualResources], async () => {
    await db.clients.bulkPut(data.clients ?? [])
    await db.installations.bulkPut(data.installations ?? [])
    await db.equipment.bulkPut(data.equipment ?? [])
    await db.interventions.bulkPut(data.interventions ?? [])
    await db.calculationHistory.bulkPut(data.calculationHistory ?? [])
    await db.visualResources.bulkPut(data.visualResources ?? [])
  })
}
