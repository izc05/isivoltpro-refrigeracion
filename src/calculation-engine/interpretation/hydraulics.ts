import type { CalculationInterpretation } from '../types'

export function interpretWaterFlow(deltaTK: number): CalculationInterpretation {
  const indicator = deltaTK < 4 ? 'low' : deltaTK <= 8 ? 'normal' : 'high'
  return {
    title: 'Caudal de agua orientativo',
    summary: 'Calcula caudal desde potencia térmica y salto térmico usando calor específico y densidad del fluido.',
    indicator,
    causes: indicator === 'low'
      ? ['Salto térmico bajo: caudal elevado, mayor consumo de bombeo o intercambio sobredimensionado']
      : indicator === 'high'
        ? ['Salto térmico alto: caudal bajo, riesgo de intercambio insuficiente o control inestable']
        : ['Salto térmico en zona orientativa habitual para muchas aplicaciones de climatización por agua'],
    nextChecks: ['Confirmar régimen de diseño', 'Verificar tipo de fluido y glicol', 'Calcular pérdidas hidráulicas', 'Comprobar curva de bomba', 'Validar con fabricante/proyecto'],
    formula: 'Caudal másico = Potencia / (cp · ΔT). Caudal volumétrico = caudal másico / densidad.',
    example: '10 kW con ΔT 5 K y agua da aprox. 0,478 l/s, 1,72 m³/h.',
  }
}
