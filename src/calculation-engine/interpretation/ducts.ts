import type { CalculationInterpretation } from '../types'

export function interpretDuctSizing(velocityMs: number, pressureLossPaM = 0): CalculationInterpretation {
  const indicator = velocityMs > 7 || pressureLossPaM > 1.5 ? 'high' : velocityMs <= 4 && pressureLossPaM < 0.45 ? 'low' : 'normal'
  return {
    title: 'Dimensionado orientativo de conducto',
    summary: 'Calcula sección, velocidad real y pérdida lineal aproximada. No sustituye cálculo acústico, accesorios, equilibrado ni normativa del proyecto.',
    indicator,
    causes: indicator === 'high'
      ? ['Velocidad o pérdida lineal elevada: posible ruido, mayor presión de ventilador o dificultad de equilibrado']
      : indicator === 'low'
        ? ['Velocidad baja: conducto más grande, menor ruido y menor pérdida, con más espacio requerido']
        : ['Velocidad y pérdida lineal en zona orientativa razonable para predimensionado'],
    nextChecks: ['Añadir accesorios y pérdidas singulares', 'Comprobar velocidad recomendada por uso', 'Revisar acústica', 'Verificar espacio disponible', 'Validar con proyecto o fabricante'],
    formula: 'Área = Q / v. Diámetro por área = √(4 · A / π). Pérdida lineal aproximada: Δp/L = f · (1/Dh) · ρv²/2.',
    example: '1.000 m³/h a 5 m/s requiere aprox. 0,0556 m²; la pérdida real depende de tamaño normalizado, rugosidad y diámetro hidráulico.',
  }
}
