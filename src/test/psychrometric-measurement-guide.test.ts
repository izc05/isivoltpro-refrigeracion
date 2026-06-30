import { describe, expect, it } from 'vitest'
import {
  isPsychrometricMeasurementScope,
  psychrometricMeasurementChecklist,
  psychrometricMeasurementErrors,
  psychrometricMeasurementSteps,
} from '../visual/psychrometric-measurement-guide'

describe('psychrometric measurement guide', () => {
  it('is activated only for dry-bulb and relative-humidity visual help', () => {
    expect(isPsychrometricMeasurementScope({ module: 'psychrometrics', calculator: 'dry-bulb-relative-humidity' })).toBe(true)
    expect(isPsychrometricMeasurementScope({ module: 'psychrometrics', calculator: 'condensation-risk' })).toBe(false)
    expect(isPsychrometricMeasurementScope({ module: 'refrigerants', calculator: 'dry-bulb-relative-humidity' })).toBe(false)
  })

  it('contains the complete four-step field procedure', () => {
    expect(psychrometricMeasurementSteps).toHaveLength(4)
    expect(psychrometricMeasurementSteps.some((step) => step.title.includes('zona representativa'))).toBe(true)
    expect(psychrometricMeasurementSteps.some((step) => step.title.includes('estabilice'))).toBe(true)
    expect(psychrometricMeasurementSteps.some((step) => step.text.includes('presión o altitud'))).toBe(true)
  })

  it('covers direct airflow, solar radiation and final checks', () => {
    expect(psychrometricMeasurementErrors.some((error) => error.includes('difusor'))).toBe(true)
    expect(psychrometricMeasurementErrors.some((error) => error.includes('radiación solar'))).toBe(true)
    expect(psychrometricMeasurementChecklist.some((item) => item.includes('°C y % HR'))).toBe(true)
  })
})
