import { db, newId, type VisualResource, type VisualResourceType } from '../domain/storage/db'

export type VisualHelpRequest = {
  module: string
  calculator: string
  field?: string
}

const now = '2026-06-26T00:00:00.000Z'

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

type BuiltinInput = {
  id: string
  module: string
  calculator: string
  title: string
  description: string
  imagePath: string
  altText: string
  tags: string[]
  annotations: VisualResource['annotations']
  relatedFields: string[]
  sortOrder: number
}

function builtin(input: BuiltinInput): VisualResource {
  return {
    ...input,
    type: 'technical-diagram',
    thumbnailPath: input.imagePath,
    source: 'IsiVoltPro original',
    license: 'Propio',
    version: '1.0',
    relatedCalculations: [input.calculator],
    active: true,
    createdAt: now,
    updatedAt: now,
  }
}

export const builtinVisualResources: VisualResource[] = [
  builtin({
    id: 'builtin-pressure-temperature',
    module: 'refrigerants',
    calculator: 'pressure-temperature',
    title: 'Relación entre presión y temperatura de saturación',
    description: 'Selecciona el refrigerante y la referencia de presión. La tabla P/T transforma una medida de presión en temperatura de saturación, o al contrario.',
    imagePath: 'diagram:pressure-temperature',
    altText: 'Esquema de un manómetro conectado mediante una flecha a un termómetro para explicar la relación presión-temperatura.',
    tags: ['presión', 'temperatura', 'saturación', 'rocío', 'burbuja'],
    annotations: [
      { id: 'pt-pressure', xPct: 24, yPct: 50, label: 'P', description: 'Presión medida con la referencia manométrica o absoluta correctamente seleccionada.', field: 'pressure' },
      { id: 'pt-temperature', xPct: 74, yPct: 50, label: 'Tsat', description: 'Temperatura de saturación resultante para el refrigerante.', field: 'temperature' },
    ],
    relatedFields: ['pressure', 'temperature', 'pressureKind'],
    sortOrder: 10,
  }),
  builtin({
    id: 'builtin-superheat',
    module: 'refrigerants',
    calculator: 'superheat',
    title: 'Medición de recalentamiento en aspiración',
    description: 'Mide la presión de baja y la temperatura de la tubería de aspiración cerca de la salida del evaporador. Para mezclas con glide utiliza rocío.',
    imagePath: 'diagram:superheat',
    altText: 'Esquema del evaporador con manómetro de baja y pinza de temperatura sobre la tubería de aspiración.',
    tags: ['recalentamiento', 'aspiración', 'evaporador', 'rocío'],
    annotations: [
      { id: 'sh-pressure', xPct: 56, yPct: 50, label: 'P baja', description: 'Presión de aspiración estabilizada.', field: 'suctionPressure' },
      { id: 'sh-temperature', xPct: 74, yPct: 50, label: 'T tubo', description: 'Sonda bien fijada y aislada sobre la tubería de aspiración.', field: 'suctionPipeTemperature' },
    ],
    relatedFields: ['suctionPressure', 'suctionPipeTemperature'],
    sortOrder: 20,
  }),
  builtin({
    id: 'builtin-subcooling',
    module: 'refrigerants',
    calculator: 'subcooling',
    title: 'Medición de subenfriamiento en línea de líquido',
    description: 'Mide la presión de alta y la temperatura de la línea de líquido cerca de la salida del condensador. Para mezclas con glide utiliza burbuja.',
    imagePath: 'diagram:subcooling',
    altText: 'Esquema del condensador con manómetro de alta y pinza de temperatura sobre la línea de líquido.',
    tags: ['subenfriamiento', 'líquido', 'condensador', 'burbuja'],
    annotations: [
      { id: 'sc-pressure', xPct: 28, yPct: 50, label: 'P alta', description: 'Presión de condensación estabilizada.', field: 'liquidPressure' },
      { id: 'sc-temperature', xPct: 44, yPct: 50, label: 'T tubo', description: 'Temperatura real de la línea de líquido.', field: 'liquidLineTemperature' },
    ],
    relatedFields: ['liquidPressure', 'liquidLineTemperature'],
    sortOrder: 30,
  }),
  builtin({
    id: 'builtin-vacuum',
    module: 'refrigerants',
    calculator: 'vacuum-procedure',
    title: 'Montaje de bomba, manifold y vacuómetro',
    description: 'Coloca el vacuómetro lo más alejado posible de la bomba, evacúa, aísla y observa la evolución de micrones antes de liberar refrigerante.',
    imagePath: 'diagram:vacuum',
    altText: 'Esquema de bomba de vacío, manifold, vacuómetro y equipo conectados para una prueba de vacío.',
    tags: ['vacío', 'micrones', 'estanqueidad', 'aislamiento'],
    annotations: [
      { id: 'vac-pump', xPct: 20, yPct: 70, label: 'Bomba', description: 'Bomba con aceite limpio y caudal adecuado.', field: 'initialVacuum' },
      { id: 'vac-gauge', xPct: 71, yPct: 36, label: 'Vacuómetro', description: 'Medición lejos de la bomba para representar el sistema.', field: 'finalVacuum' },
    ],
    relatedFields: ['initialVacuum', 'finalVacuum', 'vacuumTestDuration'],
    sortOrder: 40,
  }),
  builtin({
    id: 'builtin-additional-charge',
    module: 'refrigerants',
    calculator: 'additional-charge',
    title: 'Carga adicional por longitud de tubería',
    description: 'Resta la longitud incluida por el fabricante a la longitud instalada y multiplica solo el exceso por el dato oficial en g/m. Carga siempre por peso.',
    imagePath: 'diagram:additional-charge',
    altText: 'Esquema de botella de refrigerante sobre báscula conectada a un equipo con una longitud adicional de tubería.',
    tags: ['carga', 'peso', 'báscula', 'g/m', 'tubería'],
    annotations: [
      { id: 'charge-scale', xPct: 20, yPct: 82, label: 'Báscula', description: 'Control de masa añadida durante la carga.', field: 'factoryCharge' },
      { id: 'charge-length', xPct: 49, yPct: 47, label: 'L extra', description: 'Solo la longitud que supera la incluida por el fabricante.', field: 'installedLength' },
    ],
    relatedFields: ['factoryCharge', 'includedLength', 'installedLength', 'additionalPerMeterG'],
    sortOrder: 50,
  }),
  builtin({
    id: 'builtin-technical-converter',
    module: 'electricity',
    calculator: 'technical-converter',
    title: 'Conversión entre unidades técnicas',
    description: 'Selecciona magnitud, unidad de origen y unidad de destino. No mezcles presión absoluta con manométrica ni temperatura con diferencia de temperatura.',
    imagePath: 'diagram:technical-converter',
    altText: 'Esquema de conversión de bar a psi y de grados Celsius a Fahrenheit.',
    tags: ['conversor', 'unidades', 'presión', 'temperatura'],
    annotations: [
      { id: 'converter-source', xPct: 22, yPct: 34, label: 'Origen', description: 'Unidad del valor introducido.', field: 'fromUnit' },
      { id: 'converter-target', xPct: 78, yPct: 34, label: 'Destino', description: 'Unidad en la que se mostrará el resultado.', field: 'toUnit' },
    ],
    relatedFields: ['fromUnit', 'toUnit', 'value'],
    sortOrder: 60,
  }),
  builtin({
    id: 'builtin-refrigerant-safety',
    module: 'refrigerants',
    calculator: 'refrigerant-safety',
    title: 'Identificación del refrigerante antes de intervenir',
    description: 'Comprueba placa, clase de seguridad, GWP/PCA, aceite compatible y ficha de seguridad. Una presión parecida no convierte dos refrigerantes en equivalentes.',
    imagePath: 'diagram:refrigerant-safety',
    altText: 'Esquema de una botella R32 con etiqueta A2L, símbolo de inflamabilidad y datos de GWP y aceite.',
    tags: ['seguridad', 'A2L', 'GWP', 'aceite', 'placa'],
    annotations: [
      { id: 'ref-label', xPct: 22, yPct: 46, label: 'Etiqueta', description: 'Identificación exacta del refrigerante y lote.', field: 'refrigerant' },
      { id: 'ref-safety', xPct: 51, yPct: 42, label: 'Clase', description: 'Clasificación de toxicidad e inflamabilidad.', field: 'safetyClass' },
    ],
    relatedFields: ['refrigerant', 'safetyClass', 'gwp'],
    sortOrder: 70,
  }),
  builtin({
    id: 'builtin-refrigerant-comparison',
    module: 'refrigerants',
    calculator: 'refrigerant-comparison',
    title: 'Comparación técnica sin asumir sustitución directa',
    description: 'Compara seguridad, GWP/PCA, glide, presiones, temperatura crítica, aceite y requisitos del fabricante antes de valorar cualquier alternativa.',
    imagePath: 'diagram:refrigerant-comparison',
    altText: 'Esquema de dos refrigerantes comparados por seguridad, GWP y glide con aviso de no sustitución directa.',
    tags: ['comparación', 'sustitución', 'GWP', 'glide', 'compatibilidad'],
    annotations: [
      { id: 'compare-a', xPct: 21, yPct: 50, label: 'Gas A', description: 'Refrigerante original indicado por el fabricante.', field: 'sourceRefrigerant' },
      { id: 'compare-b', xPct: 79, yPct: 50, label: 'Gas B', description: 'Alternativa a evaluar, no equivalente automática.', field: 'targetRefrigerant' },
    ],
    relatedFields: ['sourceRefrigerant', 'targetRefrigerant'],
    sortOrder: 80,
  }),
  builtin({
    id: 'builtin-guided-diagnostics',
    module: 'diagnostics',
    calculator: 'guided-diagnostics',
    title: 'Diagnóstico basado en mediciones',
    description: 'Parte del síntoma, registra presión y temperatura, contrasta hipótesis y señala qué dato falta. Evita diagnosticar únicamente por una presión.',
    imagePath: 'diagram:guided-diagnostics',
    altText: 'Diagrama de flujo desde un síntoma hacia mediciones, hipótesis probable y datos pendientes.',
    tags: ['diagnóstico', 'síntoma', 'medición', 'hipótesis'],
    annotations: [
      { id: 'diag-symptom', xPct: 50, yPct: 18, label: 'Síntoma', description: 'Descripción observable y concreta del fallo.', field: 'symptom' },
      { id: 'diag-checks', xPct: 50, yPct: 51, label: 'Medir', description: 'Presiones, temperaturas, consumo y estado de componentes.', field: 'measurements' },
    ],
    relatedFields: ['symptom', 'measurements'],
    sortOrder: 90,
  }),
  builtin({
    id: 'builtin-psychrometrics-rh',
    module: 'psychrometrics',
    calculator: 'dry-bulb-relative-humidity',
    title: 'Medición de temperatura seca y humedad relativa',
    description: 'Ubica la sonda en zona representativa, alejada de impulsión directa, radiación solar y paredes frías o calientes.',
    imagePath: 'diagram:psychrometrics-rh',
    altText: 'Esquema de una sonda midiendo temperatura seca y humedad relativa en una estancia.',
    tags: ['psicrometría', 'humedad', 'temperatura seca'],
    annotations: [
      { id: 'probe', xPct: 52, yPct: 42, label: 'Sonda', description: 'Instrumento: termo-higrómetro calibrado.', field: 'relativeHumidityPct' },
      { id: 'zone', xPct: 35, yPct: 62, label: 'Zona útil', description: 'Medir en zona ocupada, evitando chorros de impulsión.', field: 'dryBulbC' },
    ],
    relatedFields: ['dryBulbC', 'relativeHumidityPct'],
    sortOrder: 100,
  }),
  builtin({
    id: 'builtin-duct-airflow',
    module: 'ducts',
    calculator: 'duct-sizing',
    title: 'Caudal y velocidad en conducto',
    description: 'El caudal atraviesa la sección del conducto. La velocidad máxima define la sección mínima.',
    imagePath: 'diagram:duct-airflow',
    altText: 'Esquema de aire atravesando una sección rectangular de conducto.',
    tags: ['conductos', 'caudal', 'velocidad'],
    annotations: [
      { id: 'airflow', xPct: 28, yPct: 50, label: 'Caudal', description: 'Instrumento: balómetro, anemómetro o dato de diseño.', field: 'airflowM3h' },
      { id: 'section', xPct: 66, yPct: 50, label: 'Sección', description: 'La sección aumenta si reduces la velocidad máxima.', field: 'maxVelocityMs' },
    ],
    relatedFields: ['airflowM3h', 'maxVelocityMs'],
    sortOrder: 110,
  }),
  builtin({
    id: 'builtin-hydraulics-flow',
    module: 'hydraulics',
    calculator: 'water-flow',
    title: 'Caudal de agua en batería o circuito',
    description: 'El salto térmico entre ida y retorno permite estimar el caudal para una potencia dada.',
    imagePath: 'diagram:hydraulics-flow',
    altText: 'Esquema de ida y retorno de agua en una batería con temperaturas.',
    tags: ['hidráulica', 'aerotermia', 'caudal'],
    annotations: [
      { id: 'supply', xPct: 28, yPct: 38, label: 'Ida', description: 'Medir temperatura de ida con contacto firme o sonda insertada.', field: 'deltaTK' },
      { id: 'return', xPct: 72, yPct: 66, label: 'Retorno', description: 'El salto térmico es la diferencia entre ida y retorno.', field: 'deltaTK' },
    ],
    relatedFields: ['thermalPowerKw', 'deltaTK'],
    sortOrder: 120,
  }),
]

export async function listVisualResources(module: string, calculator: string) {
  const local = await db.visualResources.where({ module, calculator }).toArray()
  const builtinResources = builtinVisualResources.filter((resource) => resource.module === module && resource.calculator === calculator)
  return [...builtinResources, ...local].filter((resource) => resource.active).sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title))
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
