import type { CalculationInterpretation } from '../types'
import type { PsychrometricState } from '../formulas/psychrometrics/types'

export type PsychrometricInterpretation = {
  tone: 'success' | 'warning' | 'danger' | 'info'
  title: string
  summary: string
  observations: string[]
  recommendedChecks: string[]
}

function escalateTone(current: PsychrometricInterpretation['tone'], next: PsychrometricInterpretation['tone']) {
  const rank: Record<PsychrometricInterpretation['tone'], number> = { success: 0, info: 1, warning: 2, danger: 3 }
  return rank[next] > rank[current] ? next : current
}

export function interpretPsychrometricState(state: PsychrometricState): PsychrometricInterpretation {
  const observations: string[] = []
  const recommendedChecks = ['Confirmar con instrumento calibrado', 'Verificar presión atmosférica o altitud', 'Comparar con condiciones de diseño o fabricante']
  let tone: PsychrometricInterpretation['tone'] = 'success'
  let title = 'Estado psicrométrico estable'

  if (state.relativeHumidityPct < 30) {
    tone = 'warning'
    title = 'Aire seco'
    observations.push('La humedad relativa está por debajo de una zona habitual de confort.')
    recommendedChecks.push('Revisar renovación de aire, calefacción y humidificación si aplica.')
  } else if (state.relativeHumidityPct > 70) {
    tone = 'warning'
    title = 'Humedad relativa elevada'
    observations.push('La humedad relativa alta puede aumentar el riesgo de condensación en superficies frías.')
    recommendedChecks.push('Comprobar ventilación, infiltraciones, drenajes y temperatura de superficies.')
  } else {
    observations.push('La humedad relativa está en una zona orientativa habitual.')
  }

  if (state.dewPointSpreadK <= 2) {
    tone = 'danger'
    title = 'Aire muy próximo a saturación'
    observations.push('La temperatura seca está muy cerca del punto de rocío.')
    recommendedChecks.push('Medir superficies frías y aislamientos con margen de seguridad.')
  } else if (state.dewPointSpreadK <= 5) {
    tone = escalateTone(tone, 'warning')
    observations.push('Existe poco margen antes de alcanzar el punto de rocío.')
  }

  if (state.absoluteHumidityGM3 > 18) observations.push('La humedad absoluta es alta para muchas condiciones interiores.')
  if (state.moistAirEnthalpyKJkg > 65) observations.push('La entalpía del aire es elevada; puede indicar carga térmica sensible/latente importante.')
  if (state.pressurePa < 50000 || state.pressurePa > 110000) {
    tone = escalateTone(tone, 'warning')
    observations.push('La presión atmosférica está fuera del rango recomendado de uso general.')
    recommendedChecks.push('Revisar si se introdujo Pa, hPa, mbar, kPa o bar absoluto correctamente.')
  }

  observations.push('Interpretación orientativa: prevalecen proyecto, normativa, fabricante y medición en campo.')
  return {
    tone,
    title,
    summary: `Aire a ${state.dryBulbC.toFixed(1)} °C, ${state.relativeHumidityPct.toFixed(1)} % HR y punto de rocío ${state.dewPointC.toFixed(1)} °C.`,
    observations,
    recommendedChecks,
  }
}

export function psychrometricInterpretationToCalculation(interpretation: PsychrometricInterpretation): CalculationInterpretation {
  return {
    title: interpretation.title,
    summary: interpretation.summary,
    indicator: interpretation.tone === 'success' ? 'normal' : interpretation.tone === 'danger' ? 'high' : interpretation.tone === 'warning' ? 'info' : 'info',
    causes: interpretation.observations,
    nextChecks: interpretation.recommendedChecks,
    formula: 'PsychroLib en sistema SI: propiedades de aire húmedo desde una pareja válida de variables y presión atmosférica.',
    example: '25 °C, 50 % HR y 101325 Pa dan un punto de rocío cercano a 13,9 °C y una entalpía cercana a 50 kJ/kg.',
  }
}

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
