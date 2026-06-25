import { interpretDuctSizing } from '../interpretation/ducts'
import type { CalculationContext, CalculationEnvelope, CalculationWarning } from '../types'
import { defaultCalculationContext } from '../types'
import { DuctSizingInputSchema, type DuctSizingInput } from '../validation/ducts'

export type DuctSizingResult = {
  airflowM3s: number
  areaM2: number
  areaCm2: number
  circularDiameterM: number
  circularDiameterMm: number
  rectangularWidthMm: number
  rectangularHeightMm: number
  actualVelocityMs: number
}

const warnings: CalculationWarning[] = [
  { code: 'ORIENTATIVE_RESULT', severity: 'info', message: 'Dimensionado orientativo; revisar pérdidas de carga, ruido, accesorios y normativa aplicable.' },
  { code: 'PROJECT_PRIORITY', severity: 'info', message: 'El proyecto, fabricante y mediciones de equilibrado tienen prioridad.' },
]

function roundToStep(value: number, step: number) {
  return Math.ceil(value / step) * step
}

export function calculateDuctSizing(input: DuctSizingInput, context: CalculationContext = defaultCalculationContext()): CalculationEnvelope<DuctSizingInput, DuctSizingResult> {
  const parsed = DuctSizingInputSchema.parse(input)
  const airflowM3s = parsed.airflowM3h / 3600
  const areaM2 = airflowM3s / parsed.maxVelocityMs
  const circularDiameterM = Math.sqrt((4 * areaM2) / Math.PI)
  const rawHeightM = Math.sqrt(areaM2 / parsed.preferredAspectRatio)
  const rawWidthM = rawHeightM * parsed.preferredAspectRatio
  const rectangularWidthMm = roundToStep(rawWidthM * 1000, 25)
  const rectangularHeightMm = roundToStep(rawHeightM * 1000, 25)
  const actualAreaM2 = (rectangularWidthMm / 1000) * (rectangularHeightMm / 1000)

  return {
    module: 'ducts',
    calculator: 'duct-sizing',
    calculatedAt: context.calculatedAt,
    source: {
      provider: 'IsiVoltPro duct sizing formula',
      version: '1.0',
      generatedAt: null,
      reviewedAt: '2026-06-25',
      limitations: ['No incluye pérdidas de carga, accesorios, rugosidad, acústica ni requisitos normativos específicos.'],
    },
    units: { airflow: 'm3/h', velocity: 'm/s', area: 'm2', diameter: 'mm', result: 'SI' },
    inputs: parsed,
    result: {
      airflowM3s,
      areaM2,
      areaCm2: areaM2 * 10000,
      circularDiameterM,
      circularDiameterMm: circularDiameterM * 1000,
      rectangularWidthMm,
      rectangularHeightMm,
      actualVelocityMs: airflowM3s / actualAreaM2,
    },
    interpretation: interpretDuctSizing(parsed.maxVelocityMs),
    warnings,
  }
}
