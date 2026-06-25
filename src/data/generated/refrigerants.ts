export type RefrigerantKey =
  | 'R32'
  | 'R410A'
  | 'R134a'
  | 'R407C'
  | 'R404A'
  | 'R507A'
  | 'R22'
  | 'R290'
  | 'R600a'
  | 'R1234yf'
  | 'R1234ze(E)'
  | 'R744'
  | 'R454B'
  | 'R452B'
  | 'R455A'
  | 'R454C'
  | 'R513A'
  | 'R450A'
  | 'R470A'
  | 'R466A'
  | 'R448A'
  | 'R449A'

export type SaturationPoint = {
  pressurePaAbs: number
  bubbleC: number | null
  dewC: number | null
  source: string
  warning?: string | null
}

export type RefrigerantTable = {
  schemaVersion: 1
  generatedAt: string | null
  generator: 'CoolProp' | 'pending'
  coolPropVersion: string | null
  refrigerant: RefrigerantKey
  refrigerantType: 'pure' | 'azeotropic' | 'near-azeotropic' | 'zeotropic' | 'pending'
  validRange: { minC: number | null; maxC: number | null; minPressurePaAbs: number | null; maxPressurePaAbs: number | null }
  limitations: string[]
  points: SaturationPoint[]
}

export const pendingTables: RefrigerantTable[] = [
  'R32','R410A','R134a','R407C','R404A','R507A','R22','R290','R600a','R1234yf','R1234ze(E)','R744','R454B','R452B','R455A','R454C','R513A','R450A','R470A','R466A','R448A','R449A',
].map((refrigerant) => ({
  schemaVersion: 1,
  generatedAt: null,
  generator: 'pending',
  coolPropVersion: null,
  refrigerant: refrigerant as RefrigerantKey,
  refrigerantType: ['R407C','R404A','R448A','R449A','R452B','R455A','R454B','R454C'].includes(refrigerant) ? 'zeotropic' : 'pending',
  validRange: { minC: null, maxC: null, minPressurePaAbs: null, maxPressurePaAbs: null },
  limitations: ['Datos termodinámicos pendientes de generar con scripts/generate_refrigerant_data.py y CoolProp. No se usan valores manuales.'],
  points: [],
}))
