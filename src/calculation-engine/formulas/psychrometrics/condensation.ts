import { PsychrometricsCondensationInputSchema, type PsychrometricsCondensationInput } from '../../validation/psychrometrics'
import type { CalculationContext, CalculationEnvelope, CalculationWarning } from '../../types'
import { defaultCalculationContext } from '../../types'
import { psychrometricInterpretationToCalculation } from '../../interpretation/psychrometrics'
import { calculateFromRelativeHumidity } from './calculate-from-relative-humidity'
import { psychrometricsSource, psychrometricWarnings } from './envelope'
import type { CondensationRiskResult } from './types'

export function calculateCondensationRisk(input: PsychrometricsCondensationInput, context: CalculationContext = defaultCalculationContext()): CalculationEnvelope<PsychrometricsCondensationInput, CondensationRiskResult> {
  const parsed = PsychrometricsCondensationInputSchema.parse(input)
  const state = calculateFromRelativeHumidity(parsed, context).result
  const surfaceMarginK = parsed.surfaceTempC - state.dewPointC
  const safeSurfaceTempC = state.dewPointC + parsed.safetyMarginK
  const risk = parsed.surfaceTempC <= state.dewPointC ? 'high' : parsed.surfaceTempC < safeSurfaceTempC ? 'preventive' : 'none'
  const result: CondensationRiskResult = {
    state,
    surfaceTempC: parsed.surfaceTempC,
    safetyMarginK: parsed.safetyMarginK,
    surfaceMarginK,
    safeSurfaceTempC,
    risk,
    title: risk === 'high' ? 'Riesgo alto de condensación' : risk === 'preventive' ? 'Margen preventivo bajo' : 'Sin riesgo inmediato orientativo',
    summary: risk === 'high'
      ? 'La superficie está a igual o menor temperatura que el punto de rocío calculado.'
      : risk === 'preventive'
        ? 'La superficie supera el punto de rocío, pero no alcanza el margen de seguridad indicado.'
        : 'La superficie queda por encima del punto de rocío más el margen de seguridad.',
    recommendedChecks: ['Medir la superficie real con sonda o cámara térmica', 'Revisar aislamiento, puentes térmicos y caudal de aire', 'Confirmar condiciones estables antes de concluir'],
  }
  const warnings: CalculationWarning[] = psychrometricWarnings(state)
  if (risk === 'high') warnings.push({ code: 'condensation-risk-high', severity: 'danger', message: 'La superficie está por debajo del punto de rocío calculado.' })
  if (risk === 'preventive') warnings.push({ code: 'condensation-risk-preventive', severity: 'warning', message: 'El margen frente al rocío es menor que el margen de seguridad.' })
  return {
    module: 'psychrometrics',
    calculator: 'condensation-risk',
    calculatedAt: context.calculatedAt,
    source: psychrometricsSource,
    units: { pressure: 'Pa', pressureKind: 'absolute', temperature: 'C', result: 'condensation-risk' },
    inputs: parsed,
    result,
    interpretation: psychrometricInterpretationToCalculation({
      tone: risk === 'high' ? 'danger' : risk === 'preventive' ? 'warning' : 'success',
      title: result.title,
      summary: result.summary,
      observations: [
        `Punto de rocío calculado: ${state.dewPointC.toFixed(1)} °C.`,
        `Margen de superficie: ${surfaceMarginK.toFixed(1)} K.`,
        'Resultado orientativo: validar con medición de superficie y condiciones reales.',
      ],
      recommendedChecks: result.recommendedChecks,
    }),
    warnings,
  }
}
