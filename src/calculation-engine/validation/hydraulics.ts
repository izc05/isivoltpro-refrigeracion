import { z } from 'zod'

export const WaterFlowInputSchema = z.object({
  thermalPowerKw: z.number().finite().positive('Introduce una potencia mayor que cero.'),
  deltaTK: z.number().finite().positive('Introduce un salto térmico mayor que cero.').max(40, 'El salto térmico es demasiado alto para este cálculo orientativo.'),
  specificHeatKjKgK: z.number().finite().positive().default(4.186),
  densityKgM3: z.number().finite().positive().default(1000),
})

export type WaterFlowInput = z.infer<typeof WaterFlowInputSchema>
