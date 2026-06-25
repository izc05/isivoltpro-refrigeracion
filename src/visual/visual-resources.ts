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
    type: 'chart',
    title: 'Carta psicrométrica simplificada',
    description: 'Visualiza temperatura seca, humedad absoluta, curvas de humedad relativa y un proceso orientativo entre puntos de aire.',
    imagePath: 'diagram:psychrometrics-rh',
    thumbnailPath: 'diagram:psychrometrics-rh',
    altText: 'Carta psicrométrica simplificada con curvas de humedad relativa, líneas de entalpía y puntos de proceso.',
    tags: ['psicrometría', 'carta', 'humedad', 'entalpía'],
    source: 'IsiVoltPro original',
    license: 'Propio',
    version: '1.0',
    annotations: [
      { id: 'aa', xPct: 76, yPct: 17, label: 'AA', description: 'Aire ambiente o aire exterior de referencia.', field: 'relativeHumidityPct' },
      { id: 'da', xPct: 60, yPct: 76, label: 'DA', description: 'Aire de diseño o estado calculado.', field: 'dryBulbC' },
      { id: 'pp', xPct: 36, yPct: 76, label: 'PP', description: 'Punto de proceso orientativo.', field: 'dewPointC' },
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
    title: 'Tramo de conducto con pérdida lineal',
    description: 'Representa caudal, sección, velocidad, longitud, material y pérdida Pa/m antes de sumar accesorios.',
    imagePath: 'diagram:duct-airflow',
    thumbnailPath: 'diagram:duct-airflow',
    altText: 'Esquema de un tramo de conducto con sentido del aire, medida rectangular, diámetro equivalente, velocidad y pérdida lineal.',
    tags: ['conductos', 'caudal', 'velocidad', 'pérdida'],
    source: 'IsiVoltPro original',
    license: 'Propio',
    version: '1.0',
    annotations: [
      { id: 'airflow', xPct: 24, yPct: 48, label: 'Caudal', description: 'Dato de diseño o suma de terminales del tramo.', field: 'airflowM3h' },
      { id: 'section', xPct: 53, yPct: 34, label: 'Sección', description: 'Medida comercial rectangular o circular.', field: 'maxVelocityMs' },
      { id: 'loss', xPct: 70, yPct: 78, label: 'Pa/m', description: 'Pérdida lineal aproximada antes de accesorios.', field: 'targetPressureLossPaM' },
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
