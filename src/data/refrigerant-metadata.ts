import type { RefrigerantKey } from './generated/refrigerants'

type Sourced<T> = { value: T | null; source: string; reviewedAt: string; note?: string }

export type RefrigerantCategory = 'traditional' | 'lower-gwp'

export type RefrigerantMetadata = {
  key: RefrigerantKey
  name: string
  category: RefrigerantCategory
  composition: Sourced<string>
  familyType: Sourced<string>
  safetyClass: Sourced<string>
  flammability: Sourced<string>
  toxicity: Sourced<string>
  gwp: Sourced<number>
  odp: Sourced<number>
  criticalTempC: Sourced<number>
  molarMassKgKmol: Sourced<number>
  glideK: Sourced<number>
  oils: Sourced<string>
  chargingMethod: Sourced<string>
  workPressure: Sourced<string>
  applications: Sourced<string>
  compatibility: Sourced<string>
  warnings: string[]
}

const reviewedAt = '2026-06-24'
const pending = <T,>(note = 'Dato pendiente de verificación'): Sourced<T> => ({ value: null, source: 'Pendiente de fuente validada', reviewedAt, note })
const sourced = <T,>(value: T, source: string, note?: string): Sourced<T> => ({ value, source, reviewedAt, note })

const lowerGwp: RefrigerantKey[] = ['R32', 'R290', 'R600a', 'R744', 'R1234yf', 'R1234ze(E)', 'R454B', 'R452B', 'R455A', 'R454C', 'R513A', 'R450A', 'R470A', 'R466A']

const names: Record<RefrigerantKey, string> = {
  R32: 'R32',
  R410A: 'R410A',
  R134a: 'R134a',
  R407C: 'R407C',
  R404A: 'R404A',
  R507A: 'R507A',
  R22: 'R22',
  R290: 'R290 - Propano',
  R600a: 'R600a - Isobutano',
  R1234yf: 'R1234yf',
  'R1234ze(E)': 'R1234ze(E)',
  R744: 'R744 / CO2',
  R454B: 'R454B',
  R452B: 'R452B',
  R455A: 'R455A',
  R454C: 'R454C',
  R513A: 'R513A',
  R450A: 'R450A',
  R470A: 'R470A',
  R466A: 'R466A',
  R448A: 'R448A',
  R449A: 'R449A',
}

const allKeys = Object.keys(names) as RefrigerantKey[]

const baseWarnings = [
  'No mezclar refrigerantes diferentes.',
  'No considerar sustituto directo sin documentación del fabricante del equipo y del refrigerante.',
  'Verificar compresor, aceite, válvula de expansión, presiones de trabajo, carga, componentes eléctricos, ventilación, seguridad y homologación.',
]

export const refrigerantMetadata: Record<RefrigerantKey, RefrigerantMetadata> = Object.fromEntries(
  allKeys.map((key) => [key, {
    key,
    name: names[key],
    category: lowerGwp.includes(key) ? 'lower-gwp' : 'traditional',
    composition: pending<string>(),
    familyType: pending<string>(),
    safetyClass: pending<string>(),
    flammability: pending<string>(),
    toxicity: pending<string>(),
    gwp: pending<number>(),
    odp: pending<number>(),
    criticalTempC: pending<number>(),
    molarMassKgKmol: pending<number>(),
    glideK: pending<number>(),
    oils: pending<string>(),
    chargingMethod: pending<string>(),
    workPressure: pending<string>('Depende de temperatura, aplicación y diseño del equipo. Consultar tabla P/T y fabricante.'),
    applications: pending<string>(),
    compatibility: pending<string>('No intercambiable sin verificación técnica. Posible sustituto solo si el fabricante lo aprueba.'),
    warnings: [...baseWarnings],
  }])
) as Record<RefrigerantKey, RefrigerantMetadata>

refrigerantMetadata.R290.safetyClass = sourced('A3', 'Ficha técnica/SDS del fabricante pendiente de adjuntar en el repositorio', 'Clasificación a verificar antes de publicación.')
refrigerantMetadata.R290.flammability = sourced('Altamente inflamable', 'Ficha técnica/SDS del fabricante pendiente de adjuntar en el repositorio')
refrigerantMetadata.R290.gwp = pending<number>('GWP muy bajo; valor numérico pendiente de fuente validada.')
refrigerantMetadata.R290.applications = sourced('Equipos diseñados y homologados para R290', 'Ficha técnica/SDS del fabricante pendiente de adjuntar en el repositorio')
refrigerantMetadata.R290.compatibility = sourced('No debe utilizarse en equipos no diseñados y homologados para R290', 'Ficha técnica/SDS del fabricante pendiente de adjuntar en el repositorio')
refrigerantMetadata.R290.warnings.push('R290 es altamente inflamable. No usar en equipos no diseñados y homologados para R290.')

refrigerantMetadata.R600a.safetyClass = sourced('A3', 'Ficha técnica/SDS del fabricante pendiente de adjuntar en el repositorio', 'Clasificación a verificar antes de publicación.')
refrigerantMetadata.R600a.flammability = sourced('Altamente inflamable', 'Ficha técnica/SDS del fabricante pendiente de adjuntar en el repositorio')
refrigerantMetadata.R600a.warnings.push('R600a es altamente inflamable. Respetar carga máxima, ventilación y homologación del equipo.')

for (const key of ['R1234yf', 'R1234ze(E)', 'R454B', 'R452B', 'R455A', 'R454C'] as RefrigerantKey[]) {
  refrigerantMetadata[key].warnings.push('Refrigerante de inflamabilidad reducida o inflamable según clasificación: comprobar clase ASHRAE/ISO y medidas de seguridad.')
}

export const refrigerantCategoryLabels: Record<RefrigerantCategory | 'all', string> = {
  all: 'Todos',
  traditional: 'Habituales',
  'lower-gwp': 'Alternativas de menor PCA / GWP',
}
