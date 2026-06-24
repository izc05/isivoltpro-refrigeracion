export type CommercialRefrigerant = {
  id: string
  tradeName: string
  manufacturer: string
  replaces: string[]
  officialDesignation: string
  composition: string
  safetyClass: string
  gwp: number | null
  chargingMethod: string
  ptDataSource: string
  approvedApplications: string[]
  warnings: string[]
}

export const commercialRefrigerants: CommercialRefrigerant[] = []

export const commercialRefrigerantWarning = [
  'No mezclar refrigerantes diferentes, aunque se comercialicen como equivalentes.',
  'Antes de efectuar una sustitución, comprobar la documentación del fabricante del equipo y del refrigerante.',
  'Cada producto comercial necesita su propia tabla P/T, composición, clasificación de seguridad, método de carga y documentación técnica.',
]
