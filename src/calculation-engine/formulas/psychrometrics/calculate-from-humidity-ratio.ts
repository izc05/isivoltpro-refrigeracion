import { PsychrometricsHumidityRatioInputSchema, type PsychrometricsHumidityRatioInput } from '../../validation/psychrometrics'
import type { CalculationContext } from '../../types'
import { createPsychrometricEnvelope } from './envelope'
import { normalizeStateFromHumidityRatio } from './normalize-state'

export function calculateFromHumidityRatio(input: PsychrometricsHumidityRatioInput, context?: CalculationContext) {
  const parsed = PsychrometricsHumidityRatioInputSchema.parse(input)
  return createPsychrometricEnvelope('dry-bulb-humidity-ratio', parsed, normalizeStateFromHumidityRatio(parsed), context)
}
