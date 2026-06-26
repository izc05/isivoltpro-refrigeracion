import type { TooltipItem } from 'chart.js'

function fmt(value: number, digits = 1) {
  return Number.isFinite(value) ? value.toLocaleString('es-ES', { maximumFractionDigits: digits, minimumFractionDigits: digits }) : '--'
}

export function psychrometricTooltipLabel(context: TooltipItem<'scatter'>) {
  const raw = context.raw as { x?: number; y?: number; state?: Record<string, number>; label?: string } | undefined
  if (!raw) return ''
  const state = raw.state
  if (!state) return `${context.dataset.label ?? 'Curva'} · ${fmt(raw.x ?? 0, 1)} °C · ${fmt(raw.y ?? 0, 2)} g/kg`
  return [
    raw.label ?? context.dataset.label ?? 'Estado',
    `T seca ${fmt(state.dryBulbC, 1)} °C`,
    `HR ${fmt(state.relativeHumidityPct, 1)} %`,
    `w ${fmt(state.humidityRatioGKg, 2)} g/kg`,
    `Rocío ${fmt(state.dewPointC, 1)} °C`,
    `Bulbo húmedo ${fmt(state.wetBulbC, 1)} °C`,
    `Entalpía ${fmt(state.moistAirEnthalpyKJkg, 1)} kJ/kg`,
    `Volumen ${fmt(state.moistAirVolumeM3kg, 3)} m³/kg`,
  ].join(' · ')
}
