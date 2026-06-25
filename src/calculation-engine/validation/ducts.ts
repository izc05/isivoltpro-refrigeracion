import { z } from 'zod'

export const ductAirflowUnits = ['m3/h', 'L/s', 'CFM'] as const
export const ductSizingMethods = ['velocity', 'friction'] as const
export const ductShapes = ['rectangular', 'circular'] as const
export const ductMaterials = ['galvanized-steel', 'stainless-steel', 'aluminum', 'pvc', 'smooth-flex', 'corrugated-flex', 'duct-board', 'custom'] as const
export const ductNetworkTypes = ['main-supply', 'branch-supply', 'return', 'exhaust', 'toilet-extract', 'kitchen-hood', 'flexible-run', 'quiet-zone'] as const

export const DuctSizingInputSchema = z.object({
  airflowM3h: z.number().finite().positive('Introduce un caudal mayor que cero.'),
  airflowUnit: z.enum(ductAirflowUnits).default('m3/h'),
  method: z.enum(ductSizingMethods).default('velocity'),
  shape: z.enum(ductShapes).default('rectangular'),
  material: z.enum(ductMaterials).default('galvanized-steel'),
  networkType: z.enum(ductNetworkTypes).default('main-supply'),
  maxVelocityMs: z.number().finite().positive('Introduce una velocidad mayor que cero.').max(25, 'La velocidad indicada es demasiado alta para un cálculo orientativo.'),
  targetPressureLossPaM: z.number().finite().positive('Introduce una pérdida objetivo mayor que cero.').max(8, 'La pérdida objetivo es demasiado alta para un cálculo orientativo.').default(0.8),
  preferredAspectRatio: z.number().finite().min(1).max(6).default(2),
  lengthM: z.number().finite().min(0, 'La longitud no puede ser negativa.').max(500, 'La longitud indicada es demasiado alta para un tramo orientativo.').default(10),
  temperatureC: z.number().finite().min(-20).max(80).default(20),
  altitudeM: z.number().finite().min(-500).max(4000).default(0),
  customRoughnessMm: z.number().finite().min(0.001).max(10).optional(),
})

export type DuctSizingInput = z.input<typeof DuctSizingInputSchema>
export type DuctSizingParsedInput = z.infer<typeof DuctSizingInputSchema>
