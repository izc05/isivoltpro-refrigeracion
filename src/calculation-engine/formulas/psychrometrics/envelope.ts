import { psychrometricInterpretationToCalculation, interpretPsychrometricState } from '../../interpretation/psychrometrics'
import type { CalculationContext, CalculationEnvelope, CalculationWarning } from '../../types'
import { defaultCalculationContext } from '../../types'
import { pressureRangeWarning } from './units'
import type { PsychrometricState } from './types'

export const psychrometricsSource = {
  provider: 'PsychroLib',
  version: '1.1.1',
  generatedAt: null,
  reviewedAt: '2026-06-25',
  limitations: [
    'Cálculo de aire húmedo en sistema SI basado en fórmulas psicrométricas públicas.',
    'No sustituye a proyecto, normativa, documentación del fabricante ni mediciones calibradas.',
  ],
}

export function psychrometricWarnings(state: PsychrometricState): CalculationWarning[] {
  const warnings: CalculationWarning[] = []
  const pressureWarning = pressureRangeWarning(state.pressurePa)
  if (pressureWarning) warnings.push({ code: 'pressure-outside-recommended-range', severity: 'warning', message: pressureWarning })
  if (state.relativeHumidityPct > 99) warnings.push({ code: 'near-saturation', severity: 'warning', message: 'El aire está muy próximo a saturación; revisa riesgo de condensación.' })
  return warnings
}

export function createPsychrometricEnvelope<TInputs>(
  calculator: string,
  inputs: TInputs,
  result: PsychrometricState,
  context: CalculationContext = defaultCalculationContext(),
): CalculationEnvelope<TInputs, PsychrometricState> {
  const interpretation = interpretPsychrometricState(result)
  return {
    module: 'psychrometrics',
    calculator,
    calculatedAt: context.calculatedAt,
    source: psychrometricsSource,
    units: {
      pressure: 'Pa',
      pressureKind: 'absolute',
      temperature: 'C',
      humidityRatio: 'kg/kg',
      absoluteHumidity: 'g/m3',
      enthalpy: 'kJ/kg',
      result: 'psychrometric-state',
    },
    inputs,
    result,
    interpretation: psychrometricInterpretationToCalculation(interpretation),
    warnings: psychrometricWarnings(result),
  }
}
