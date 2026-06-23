import type { RefrigerantKey } from './generated/refrigerants'

type Sourced<T> = { value: T | null; source: string; reviewedAt: string; note?: string }

export type RefrigerantMetadata = {
  key: RefrigerantKey
  name: string
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
  warnings: string[]
}

const pending = <T,>(note = 'Dato pendiente de verificación'): Sourced<T> => ({ value: null, source: 'Pendiente de fuente validada', reviewedAt: '2026-06-23', note })

export const refrigerantMetadata: Record<RefrigerantKey, RefrigerantMetadata> = Object.fromEntries(
  ['R32','R410A','R134a','R407C','R404A','R22','R290','R600a','R1234yf','R744','R454B','R454C'].map((key) => [key, {
    key,
    name: key === 'R744' ? 'R744 / CO2' : key,
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
    warnings: ['No mezclar refrigerantes.', 'Verificar siempre ficha de seguridad y documentación del fabricante.'],
  }])
) as Record<RefrigerantKey, RefrigerantMetadata>
