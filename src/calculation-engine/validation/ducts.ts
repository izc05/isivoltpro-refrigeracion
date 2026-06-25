import { z } from 'zod'

export const DuctSizingInputSchema = z.object({
  airflowM3h: z.number().finite().positive('Introduce un caudal mayor que cero.'),
  maxVelocityMs: z.number().finite().positive('Introduce una velocidad mayor que cero.').max(25, 'La velocidad indicada es demasiado alta para un cálculo orientativo.'),
  preferredAspectRatio: z.number().finite().min(1).max(6).default(2),
})

export type DuctSizingInput = z.infer<typeof DuctSizingInputSchema>
