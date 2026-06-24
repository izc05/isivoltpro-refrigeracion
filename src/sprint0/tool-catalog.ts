import { ArrowUpDown, Gauge, LockKeyhole, Scale, Stethoscope, Table2, Thermometer } from 'lucide-react'

export const tools = [
  ['Presión - Temperatura', 'Conversión P/T con burbuja y rocío', '/pt', Thermometer],
  ['Recalentamiento', 'Temperatura de aspiración', '/superheat', ArrowUpDown],
  ['Subenfriamiento', 'Temperatura de línea de líquido', '/subcooling', ArrowUpDown],
  ['Conversor técnico', 'Presión, vacío, potencia y unidades', '/converter', Gauge],
  ['Vacío y estabilidad', 'Micrones, fases y registro', '/vacuum', Gauge],
  ['Calculadora de carga', 'Carga de placa y longitud adicional', '/charge', LockKeyhole],
  ['Refrigerantes', 'Datos, seguridad y trazabilidad', '/refrigerants', Table2],
  ['Comparador', 'Comparación sin equivalencias directas', '/compare', Scale],
  ['Diagnóstico guiado', 'Hipótesis y comprobaciones', '/diagnostics', Stethoscope],
] as const
