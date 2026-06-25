import { z } from 'zod'

const pressureSchema = z.number().finite().positive('La presión atmosférica debe ser positiva.')
const dryBulbSchema = z.number().finite().min(-50, 'La temperatura seca mínima es -50 °C.').max(80, 'La temperatura seca máxima es 80 °C.')

export const PsychrometricsInputSchema = z.object({
  dryBulbC: dryBulbSchema,
  relativeHumidityPct: z.number().finite().min(0.1, 'La humedad relativa mínima es 0,1 %.').max(100, 'La humedad relativa no puede superar el 100 %.'),
  pressurePa: pressureSchema.default(101325),
})

export type PsychrometricsInput = z.infer<typeof PsychrometricsInputSchema>

export const PsychrometricsWetBulbInputSchema = z.object({
  dryBulbC: dryBulbSchema,
  wetBulbC: z.number().finite().min(-50).max(80),
  pressurePa: pressureSchema.default(101325),
}).superRefine((value, ctx) => {
  if (value.wetBulbC > value.dryBulbC) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['wetBulbC'], message: 'El bulbo húmedo no puede ser mayor que la temperatura seca.' })
})

export const PsychrometricsDewPointInputSchema = z.object({
  dryBulbC: dryBulbSchema,
  dewPointC: z.number().finite().min(-80).max(80),
  pressurePa: pressureSchema.default(101325),
}).superRefine((value, ctx) => {
  if (value.dewPointC > value.dryBulbC) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['dewPointC'], message: 'El punto de rocío no puede ser mayor que la temperatura seca.' })
})

export const PsychrometricsHumidityRatioInputSchema = z.object({
  dryBulbC: dryBulbSchema,
  humidityRatioKgKg: z.number().finite().min(0, 'La razón de humedad no puede ser negativa.').max(0.1, 'La razón de humedad supera el rango habitual de cálculo.'),
  pressurePa: pressureSchema.default(101325),
})

export const PsychrometricsVaporPressureInputSchema = z.object({
  dryBulbC: dryBulbSchema,
  vaporPressurePa: z.number().finite().positive('La presión de vapor debe ser positiva.'),
  pressurePa: pressureSchema.default(101325),
}).superRefine((value, ctx) => {
  if (value.vaporPressurePa >= value.pressurePa) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['vaporPressurePa'], message: 'La presión de vapor debe ser menor que la presión atmosférica.' })
})

export const PsychrometricsCondensationInputSchema = z.object({
  dryBulbC: dryBulbSchema,
  relativeHumidityPct: PsychrometricsInputSchema.shape.relativeHumidityPct,
  surfaceTempC: z.number().finite().min(-50).max(100),
  safetyMarginK: z.number().finite().min(0).max(10).default(2),
  pressurePa: pressureSchema.default(101325),
})

export const PsychrometricsComparisonInputSchema = z.object({
  a: PsychrometricsInputSchema,
  b: PsychrometricsInputSchema,
})

export type PsychrometricsWetBulbInput = z.infer<typeof PsychrometricsWetBulbInputSchema>
export type PsychrometricsDewPointInput = z.infer<typeof PsychrometricsDewPointInputSchema>
export type PsychrometricsHumidityRatioInput = z.infer<typeof PsychrometricsHumidityRatioInputSchema>
export type PsychrometricsVaporPressureInput = z.infer<typeof PsychrometricsVaporPressureInputSchema>
export type PsychrometricsCondensationInput = z.infer<typeof PsychrometricsCondensationInputSchema>
export type PsychrometricsComparisonInput = z.infer<typeof PsychrometricsComparisonInputSchema>
