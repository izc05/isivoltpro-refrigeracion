export type DiagnosticInput = {
  mode: 'frio' | 'calor'
  thermalDeltaK?: number
  superheatK?: number
  subcoolingK?: number
  pressureRatio?: number
  observations?: string
}

export type DiagnosticFinding = {
  cause: string
  confidence: 'baja' | 'media' | 'alta'
  supportingData: string[]
  checks: string[]
  limitations: string[]
}

export function runDiagnosticRules(input: DiagnosticInput): DiagnosticFinding[] {
  const findings: DiagnosticFinding[] = []
  if (input.superheatK !== undefined && input.superheatK > 14) {
    findings.push({
      cause: 'Posible falta de refrigerante o alimentación insuficiente del evaporador',
      confidence: input.subcoolingK !== undefined && input.subcoolingK < 3 ? 'media' : 'baja',
      supportingData: [`Recalentamiento alto: ${input.superheatK.toFixed(1)} K`],
      checks: ['Verificar carga por peso y documentación del fabricante', 'Comprobar caudal de aire', 'Comprobar restricción y válvula de expansión'],
      limitations: ['No ordenar añadir gas solo por recalentamiento alto.'],
    })
  }
  if (input.subcoolingK !== undefined && input.subcoolingK > 12) {
    findings.push({
      cause: 'Posible exceso de refrigerante, restricción o condensación elevada',
      confidence: 'baja',
      supportingData: [`Subenfriamiento alto: ${input.subcoolingK.toFixed(1)} K`],
      checks: ['Comprobar condensador', 'Comprobar limpieza de filtros', 'Verificar carga por peso'],
      limitations: ['El subenfriamiento esperado depende del equipo y del fabricante.'],
    })
  }
  if (input.thermalDeltaK !== undefined && input.thermalDeltaK < 6 && input.mode === 'frio') {
    findings.push({
      cause: 'Comprobar caudal de aire y rendimiento térmico',
      confidence: 'media',
      supportingData: [`Salto térmico bajo: ${input.thermalDeltaK.toFixed(1)} K`],
      checks: ['Comprobar limpieza de filtros', 'Comprobar ventilador', 'Medir temperaturas de retorno e impulsión'],
      limitations: ['El salto térmico esperado cambia con humedad, carga y diseño del sistema.'],
    })
  }
  return findings
}
