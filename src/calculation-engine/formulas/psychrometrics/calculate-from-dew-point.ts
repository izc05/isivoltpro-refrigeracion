import psychrolib from 'psychrolib'
import { PsychrometricsDewPointInputSchema, type PsychrometricsDewPointInput } from '../../validation/psychrometrics'
import type { CalculationContext } from '../../types'
import { createPsychrometricEnvelope } from './envelope'
import { normalizeStateFromHumidityRatio, setPsychrolibSI } from './normalize-state'

export function calculateFromDewPoint(input: PsychrometricsDewPointInput, context?: CalculationContext) {
  const parsed = PsychrometricsDewPointInputSchema.parse(input)
  setPsychrolibSI()
  const humidityRatioKgKg = psychrolib.GetHumRatioFromTDewPoint(parsed.dewPointC, parsed.pressurePa)
  return createPsychrometricEnvelope('dry-bulb-dew-point', parsed, normalizeStateFromHumidityRatio({ ...parsed, humidityRatioKgKg }), context)
}
