import { z } from 'zod'

export const PsychrometricsInputSchema = z.object({
  dryBulbC: z.number().finite().min(-100).max(200),
  relativeHumidityPct: z.number().finite().min(0).max(100),
  pressurePa: z.number().finite().positive().default(101325),
})

export type PsychrometricsInput = z.infer<typeof PsychrometricsInputSchema>
