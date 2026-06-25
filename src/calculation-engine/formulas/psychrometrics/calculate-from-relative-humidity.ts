import psychrolib from 'psychrolib'
import { PsychrometricsInputSchema, type PsychrometricsInput } from '../../validation/psychrometrics'
import type { CalculationContext } from '../../types'
import { createPsychrometricEnvelope } from './envelope'
import { normalizeStateFromHumidityRatio, setPsychrolibSI } from './normalize-state'

export function calculateFromRelativeHumidity(input: PsychrometricsInput, context?: CalculationContext) {
  const parsed = PsychrometricsInputSchema.parse(input)
  setPsychrolibSI()
  const humidityRatioKgKg = psychrolib.GetHumRatioFromRelHum(parsed.dryBulbC, parsed.relativeHumidityPct / 100, parsed.pressurePa)
  return createPsychrometricEnvelope('dry-bulb-relative-humidity', parsed, normalizeStateFromHumidityRatio({ ...parsed, humidityRatioKgKg }), context)
}

export const calculatePsychrometricsFromRelHum = calculateFromRelativeHumidity
