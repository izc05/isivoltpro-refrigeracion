import { db, newId, type Intervention } from '../domain/storage/db'

export async function createMeasurementDraft(input: Partial<Intervention> & Pick<Intervention, 'workType'>) {
  const now = new Date().toISOString()
  await db.interventions.put({
    id: newId('int'),
    date: now.slice(0, 10),
    clientName: 'Pendiente de asignar',
    status: 'borrador',
    photos: [],
    createdAt: now,
    updatedAt: now,
    ...input,
  })
}

export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
