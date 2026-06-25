import psychrolib from 'psychrolib'
import { PsychrometricsVaporPressureInputSchema, type PsychrometricsVaporPressureInput } from '../../validation/psychrometrics'
import type { CalculationContext } from '../../types'
import { createPsychrometricEnvelope } from './envelope'
import { normalizeStateFromHumidityRatio, setPsychrolibSI } from './normalize-state'

export function calculateFromVaporPressure(input: PsychrometricsVaporPressureInput, context?: CalculationContext) {
  const parsed = PsychrometricsVaporPressureInputSchema.parse(input)
  setPsychrolibSI()
  const humidityRatioKgKg = psychrolib.GetHumRatioFromVapPres(parsed.vaporPressurePa, parsed.pressurePa)
  return createPsychrometricEnvelope('dry-bulb-vapor-pressure', parsed, normalizeStateFromHumidityRatio({ ...parsed, humidityRatioKgKg }), context)
}
