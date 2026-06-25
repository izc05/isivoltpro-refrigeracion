import { db, newId, type VisualResource, type VisualResourceType } from '../domain/storage/db'

export type VisualHelpRequest = {
  module: string
  calculator: string
  field?: string
}

const now = '2026-06-25T00:00:00.000Z'

export const visualResourceTypes: VisualResourceType[] = ['real-photo', 'annotated-photo', 'technical-diagram', 'step-by-step', 'correct-incorrect', 'interactive-diagram', 'chart']

export const visualTypeLabels: Record<VisualResourceType, string> = {
  'real-photo': 'Fotografía real',
  'annotated-photo': 'Fotografía anotada',
  'technical-diagram': 'Esquema técnico',
  'step-by-step': 'Paso a paso',
  'correct-incorrect': 'Correcto / incorrecto',
  'interactive-diagram': 'Diagrama interactivo',
  chart: 'Gráfico',
}

export const builtinVisualResources: VisualResource[] = [
  {
    id: 'builtin-psychrometrics-rh',
    module: 'psychrometrics',
    calculator: 'dry-bulb-relative-humidity',
    type: 'technical-diagram',
    title: 'Medición de temperatura seca y humedad relativa',
    description: 'Ubica la sonda en zona representativa, alejada de impulsión directa, radiación solar y paredes frías o calientes.',
    imagePath: 'diagram:psychrometrics-rh',
    thumbnailPath: 'diagram:psychrometrics-rh',
    altText: 'Esquema de una sonda midiendo temperatura seca y humedad relativa en una estancia.',
    tags: ['psicrometría', 'humedad', 'temperatura seca'],
    source: 'IsiVoltPro original',
    license: 'Propio',
    version: '1.0',
    annotations: [
      { id: 'probe', xPct: 52, yPct: 42, label: 'Sonda', description: 'Instrumento: termo-higrómetro calibrado.', field: 'relativeHumidityPct' },
      { id: 'zone', xPct: 35, yPct: 62, label: 'Zona útil', description: 'Medir en zona ocupada, evitando chorros de impulsión.', field: 'dryBulbC' },
    ],
    relatedFields: ['dryBulbC', 'relativeHumidityPct'],
    relatedCalculations: ['dry-bulb-relative-humidity'],
    active: true,
    sortOrder: 10,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'builtin-duct-airflow',
    module: 'ducts',
    calculator: 'duct-sizing',
    type: 'technical-diagram',
    title: 'Caudal y velocidad en conducto',
    description: 'El caudal atraviesa la sección del conducto. La velocidad máxima define la sección mínima.',
    imagePath: 'diagram:duct-airflow',
    thumbnailPath: 'diagram:duct-airflow',
    altText: 'Esquema de aire atravesando una sección rectangular de conducto.',
    tags: ['conductos', 'caudal', 'velocidad'],
    source: 'IsiVoltPro original',
    license: 'Propio',
    version: '1.0',
    annotations: [
      { id: 'airflow', xPct: 28, yPct: 50, label: 'Caudal', description: 'Instrumento: balómetro, anemómetro o dato de diseño.', field: 'airflowM3h' },
      { id: 'section', xPct: 66, yPct: 50, label: 'Sección', description: 'La sección aumenta si reduces la velocidad máxima.', field: 'maxVelocityMs' },
    ],
    relatedFields: ['airflowM3h', 'maxVelocityMs'],
    relatedCalculations: ['duct-sizing'],
    active: true,
    sortOrder: 20,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'builtin-hydraulics-flow',
    module: 'hydraulics',
    calculator: 'water-flow',
    type: 'technical-diagram',
    title: 'Caudal de agua en batería o circuito',
    description: 'El salto térmico entre ida y retorno permite estimar el caudal para una potencia dada.',
    imagePath: 'diagram:hydraulics-flow',
    thumbnailPath: 'diagram:hydraulics-flow',
    altText: 'Esquema de ida y retorno de agua en una batería con temperaturas.',
    tags: ['hidráulica', 'aerotermia', 'caudal'],
    source: 'IsiVoltPro original',
    license: 'Propio',
    version: '1.0',
    annotations: [
      { id: 'supply', xPct: 28, yPct: 38, label: 'Ida', description: 'Medir temperatura de ida con contacto firme o sonda insertada.', field: 'deltaTK' },
      { id: 'return', xPct: 72, yPct: 66, label: 'Retorno', description: 'El salto térmico es la diferencia entre ida y retorno.', field: 'deltaTK' },
    ],
    relatedFields: ['thermalPowerKw', 'deltaTK'],
    relatedCalculations: ['water-flow'],
    active: true,
    sortOrder: 30,
    createdAt: now,
    updatedAt: now,
  },
]

export async function listVisualResources(module: string, calculator: string) {
  const local = await db.visualResources.where({ module, calculator }).toArray()
  const builtin = builtinVisualResources.filter((resource) => resource.module === module && resource.calculator === calculator)
  return [...builtin, ...local].filter((resource) => resource.active).sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title))
}

export async function listAllLocalVisualResources() {
  return db.visualResources.orderBy('sortOrder').toArray()
}

export async function saveVisualResource(input: Omit<VisualResource, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) {
  const timestamp = new Date().toISOString()
  const record: VisualResource = {
    ...input,
    id: input.id ?? newId('visual'),
    createdAt: timestamp,
    updatedAt: timestamp,
  }
  await db.visualResources.put(record)
  return record
}

export async function toggleVisualResource(id: string, active: boolean) {
  await db.visualResources.update(id, { active, updatedAt: new Date().toISOString() })
}
