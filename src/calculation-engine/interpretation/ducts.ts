import type { CalculationInterpretation } from '../types'

export function interpretDuctSizing(velocityMs: number): CalculationInterpretation {
  const indicator = velocityMs <= 4 ? 'low' : velocityMs <= 7 ? 'normal' : 'high'
  return {
    title: 'Dimensionado orientativo de conducto',
    summary: 'Calcula sección mínima desde caudal y velocidad máxima. No sustituye cálculo acústico, pérdidas de carga ni normativa del proyecto.',
    indicator,
    causes: indicator === 'high'
      ? ['Velocidad alta: posible ruido, pérdida de carga elevada o dificultad de equilibrado']
      : indicator === 'low'
        ? ['Velocidad baja: conducto más grande, menor ruido y menor pérdida, con más espacio requerido']
        : ['Velocidad en zona orientativa habitual para muchas redes de climatización'],
    nextChecks: ['Comprobar velocidad recomendada por uso', 'Calcular pérdidas de carga', 'Revisar acústica', 'Verificar espacio disponible', 'Validar con proyecto o fabricante'],
    formula: 'Área = caudal (m³/s) / velocidad (m/s). Diámetro circular = √(4 · área / π).',
    example: '1.000 m³/h a 5 m/s requiere aprox. 0,0556 m² y diámetro circular cercano a 266 mm.',
  }
}
