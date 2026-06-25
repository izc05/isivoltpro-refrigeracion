import psychrolib from 'psychrolib'
import { PsychrometricsWetBulbInputSchema, type PsychrometricsWetBulbInput } from '../../validation/psychrometrics'
import type { CalculationContext } from '../../types'
import { createPsychrometricEnvelope } from './envelope'
import { normalizeStateFromHumidityRatio, setPsychrolibSI } from './normalize-state'

export function calculateFromWetBulb(input: PsychrometricsWetBulbInput, context?: CalculationContext) {
  const parsed = PsychrometricsWetBulbInputSchema.parse(input)
  setPsychrolibSI()
  const humidityRatioKgKg = psychrolib.GetHumRatioFromTWetBulb(parsed.dryBulbC, parsed.wetBulbC, parsed.pressurePa)
  return createPsychrometricEnvelope('dry-bulb-wet-bulb', parsed, normalizeStateFromHumidityRatio({ ...parsed, humidityRatioKgKg }), context)
}
