import Dexie, { type EntityTable } from 'dexie'

export type Client = { id: string; name: string; phone?: string; email?: string; address?: string }
export type Installation = { id: string; clientId: string; name: string; address?: string; notes?: string }
export type Equipment = { id: string; installationId: string; brand?: string; model?: string; serialNumber?: string; refrigerant?: string; plateCharge?: string; power?: string; platePhoto?: string; observations?: string }
export type Intervention = {
  id: string
  date: string
  technician?: string
  clientName: string
  installationName?: string
  equipmentLabel?: string
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
  observations?: string
  photos: string[]
  signature?: string
  createdAt: string
  updatedAt: string
}

export class IsiVoltDb extends Dexie {
  clients!: EntityTable<Client, 'id'>
  installations!: EntityTable<Installation, 'id'>
  equipment!: EntityTable<Equipment, 'id'>
  interventions!: EntityTable<Intervention, 'id'>

  constructor() {
    super('isivoltpro-refrigeracion')
    this.version(1).stores({
      clients: 'id, name',
      installations: 'id, clientId, name',
      equipment: 'id, installationId, refrigerant',
      interventions: 'id, date, clientName, workType, status, updatedAt',
    })
  }
}

export const db = new IsiVoltDb()

export function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`
}

export async function exportBackup() {
  return {
    exportedAt: new Date().toISOString(),
    clients: await db.clients.toArray(),
    installations: await db.installations.toArray(),
    equipment: await db.equipment.toArray(),
    interventions: await db.interventions.toArray(),
  }
}

export async function importBackup(data: Awaited<ReturnType<typeof exportBackup>>) {
  await db.transaction('rw', db.clients, db.installations, db.equipment, db.interventions, async () => {
    await db.clients.bulkPut(data.clients ?? [])
    await db.installations.bulkPut(data.installations ?? [])
    await db.equipment.bulkPut(data.equipment ?? [])
    await db.interventions.bulkPut(data.interventions ?? [])
  })
}
