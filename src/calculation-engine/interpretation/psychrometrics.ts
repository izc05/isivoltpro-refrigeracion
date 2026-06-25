import type { CalculationInterpretation } from '../types'

export function interpretPsychrometrics(relativeHumidityPct: number): CalculationInterpretation {
  const indicator = relativeHumidityPct < 30 ? 'low' : relativeHumidityPct > 70 ? 'high' : 'normal'
  return {
    title: 'Estado psicrométrico del aire',
    summary: 'Cálculo de propiedades de aire húmedo en sistema SI basado en temperatura seca, humedad relativa y presión atmosférica.',
    indicator,
    causes: indicator === 'low'
      ? ['Aire seco o calefacción con baja humedad interior']
      : indicator === 'high'
        ? ['Humedad elevada, posible condensación o ventilación insuficiente']
        : ['Humedad relativa en zona orientativa habitual'],
    nextChecks: ['Confirmar presión atmosférica o altitud', 'Medir con sonda calibrada', 'Comparar con condiciones de diseño', 'Evaluar punto de rocío en superficies frías'],
    formula: 'PsychroLib/ASHRAE: propiedades de aire húmedo calculadas desde T seca, HR y presión.',
    example: 'Con 25 °C, 50 % HR y 101325 Pa se obtiene un punto de rocío próximo a 13,9 °C.',
  }
}
