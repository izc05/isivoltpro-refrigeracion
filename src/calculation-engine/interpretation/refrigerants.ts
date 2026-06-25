import { evaluateSubcooling, evaluateSuperheat } from '../../domain/refrigerants/calculations'
import type { CalculationInterpretation } from '../types'

export function interpretPressureTemperature(branch: 'dew' | 'bubble'): CalculationInterpretation {
  return {
    title: 'Relación presión-temperatura',
    summary: branch === 'dew'
      ? 'Usa temperatura de rocío para evaporación y recalentamiento en mezclas con glide.'
      : 'Usa temperatura de burbuja para líquido, condensación y subenfriamiento en mezclas con glide.',
    indicator: 'info',
    causes: [],
    nextChecks: ['Confirmar presión absoluta o manométrica', 'Comparar con datos del fabricante', 'Verificar unidad antes de guardar'],
    formula: 'Tabla P/T: interpolación entre puntos validados de saturación.',
    example: 'Si introduces presión de aspiración, la app devuelve saturación por rocío y burbuja cuando existen ambos datos.',
  }
}

export function interpretSuperheat(superheatK: number): CalculationInterpretation {
  const indicator = evaluateSuperheat(superheatK)
  return {
    title: `Recalentamiento ${indicator.label.toLowerCase()}`,
    summary: indicator.explanation,
    indicator: indicator.tone,
    causes: indicator.tone === 'high'
      ? ['Evaporador poco alimentado', 'Restricción', 'Carga incorrecta', 'Medición fuera de régimen']
      : indicator.tone === 'low'
        ? ['Evaporador sobrealimentado', 'Bajo caudal de aire', 'Sonda mal colocada', 'Equipo sin estabilizar']
        : ['Funcionamiento orientativamente coherente dentro de rango habitual'],
    nextChecks: indicator.checks,
    formula: 'Recalentamiento = temperatura de tubería de aspiración - temperatura de saturación por rocío.',
    example: 'Aspiración 12 °C y saturación por rocío 5 °C dan 7 K de recalentamiento.',
  }
}

export function interpretSubcooling(subcoolingK: number): CalculationInterpretation {
  const indicator = evaluateSubcooling(subcoolingK)
  return {
    title: `Subenfriamiento ${indicator.label.toLowerCase()}`,
    summary: indicator.explanation,
    indicator: indicator.tone,
    causes: indicator.tone === 'high'
      ? ['Posible exceso de líquido', 'Restricción', 'Condensador fuera de condiciones', 'Medición fuera de régimen']
      : indicator.tone === 'low'
        ? ['Líquido poco subenfriado', 'Carga insuficiente posible', 'Condensación baja', 'Burbujas o flash gas']
        : ['Funcionamiento orientativamente coherente dentro de rango habitual'],
    nextChecks: indicator.checks,
    formula: 'Subenfriamiento = temperatura de saturación por burbuja - temperatura de línea de líquido.',
    example: 'Saturación por burbuja 42 °C y línea de líquido 36 °C dan 6 K de subenfriamiento.',
  }
}

export function interpretAdditionalCharge(): CalculationInterpretation {
  return {
    title: 'Carga adicional por longitud',
    summary: 'Cálculo orientativo basado exclusivamente en carga de placa y gramos por metro indicados por fabricante.',
    indicator: 'info',
    causes: [],
    nextChecks: ['Verificar dato g/m del fabricante', 'Pesar la carga', 'Registrar recuperado y añadido', 'No cargar solo por presión'],
    formula: 'Carga total = carga de placa + max(0, longitud instalada - longitud incluida) x g/m.',
    example: '0,85 kg de placa, 5 m incluidos, 12 m instalados y 20 g/m dan 140 g adicionales.',
  }
}

export function interpretComparison(): CalculationInterpretation {
  return {
    title: 'Comparación informativa',
    summary: 'La comparación muestra diferencias de presión y metadatos; no implica intercambiabilidad ni compatibilidad.',
    indicator: 'info',
    causes: [],
    nextChecks: ['Comprobar homologación del equipo', 'Verificar aceite y componentes', 'Consultar documentación del fabricante'],
    formula: 'Interpolación P/T por refrigerante y temperatura común.',
    example: 'Dos refrigerantes pueden tener presiones parecidas y no ser sustitutos permitidos.',
  }
}
