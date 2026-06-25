import { interpretWaterFlow } from '../interpretation/hydraulics'
import type { CalculationContext, CalculationEnvelope, CalculationWarning } from '../types'
import { defaultCalculationContext } from '../types'
import { WaterFlowInputSchema, type WaterFlowInput } from '../validation/hydraulics'

export type WaterFlowResult = {
  massFlowKgS: number
  volumeFlowM3S: number
  volumeFlowM3H: number
  volumeFlowLs: number
  volumeFlowLmin: number
}

const warnings: CalculationWarning[] = [
  { code: 'ORIENTATIVE_RESULT', severity: 'info', message: 'Resultado orientativo; verificar régimen de diseño, fluido, glicol y documentación del fabricante.' },
  { code: 'HYDRAULIC_LOSSES_NOT_INCLUDED', severity: 'warning', message: 'No incluye pérdidas de carga, accesorios, equilibrado ni curva de bomba.' },
]

export function calculateWaterFlow(input: WaterFlowInput, context: CalculationContext = defaultCalculationContext()): CalculationEnvelope<WaterFlowInput, WaterFlowResult> {
  const parsed = WaterFlowInputSchema.parse(input)
  const massFlowKgS = parsed.thermalPowerKw / (parsed.specificHeatKjKgK * parsed.deltaTK)
  const volumeFlowM3S = massFlowKgS / parsed.densityKgM3

  return {
    module: 'hydraulics',
    calculator: 'water-flow',
    calculatedAt: context.calculatedAt,
    source: {
      provider: 'IsiVoltPro hydraulic formula',
      version: '1.0',
      generatedAt: null,
      reviewedAt: '2026-06-25',
      limitations: ['Modelo sensible simplificado. No calcula glicol automáticamente ni pérdidas hidráulicas.'],
    },
    units: { power: 'kW', deltaT: 'K', specificHeat: 'kJ/kgK', density: 'kg/m3', result: 'SI' },
    inputs: parsed,
    result: {
      massFlowKgS,
      volumeFlowM3S,
      volumeFlowM3H: volumeFlowM3S * 3600,
      volumeFlowLs: volumeFlowM3S * 1000,
      volumeFlowLmin: volumeFlowM3S * 60000,
    },
    interpretation: interpretWaterFlow(parsed.deltaTK),
    warnings,
  }
}
