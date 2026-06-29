import { jsPDF } from 'jspdf'
import type { PsychrometricComparisonResult, PsychrometricState } from '../calculation-engine/formulas/psychrometrics'

export type PsychrometricExportSnapshot = {
  state?: PsychrometricState | null
  comparison?: PsychrometricComparisonResult | null
  pressurePa: number
  generatedAt?: string
}

export type RenderedPsychrometricChart = {
  blob: Blob
  dataUrl: string
  width: number
  height: number
}

const styleProperties = [
  'display',
  'visibility',
  'opacity',
  'color',
  'fill',
  'fill-opacity',
  'stroke',
  'stroke-opacity',
  'stroke-width',
  'stroke-dasharray',
  'stroke-linecap',
  'stroke-linejoin',
  'font-family',
  'font-size',
  'font-style',
  'font-weight',
  'letter-spacing',
  'text-anchor',
  'dominant-baseline',
  'paint-order',
  'vector-effect',
  'marker-start',
  'marker-mid',
  'marker-end',
] as const

const format = (value: number, digits = 1) => value.toLocaleString('es-ES', {
  minimumFractionDigits: digits,
  maximumFractionDigits: digits,
})

function safeFilename(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
}

function snapshotLabel(snapshot: PsychrometricExportSnapshot) {
  if (snapshot.comparison) {
    return `proceso-${format(snapshot.comparison.a.dryBulbC, 0)}c-${format(snapshot.comparison.b.dryBulbC, 0)}c`
  }
  if (snapshot.state) return `estado-${format(snapshot.state.dryBulbC, 0)}c-${format(snapshot.state.relativeHumidityPct, 0)}hr`
  return 'carta'
}

export function psychrometricExportFilename(snapshot: PsychrometricExportSnapshot, extension: 'png' | 'pdf') {
  const date = (snapshot.generatedAt ?? new Date().toISOString()).slice(0, 10)
  return `isivoltpro-psicrometria-${date}-${safeFilename(snapshotLabel(snapshot))}.${extension}`
}

export function psychrometricSummaryLines(snapshot: PsychrometricExportSnapshot) {
  if (snapshot.comparison) {
    const { a, b, deltas, processLabel } = snapshot.comparison
    return [
      `Proceso: ${processLabel}`,
      `Estado A: ${format(a.dryBulbC)} °C · ${format(a.relativeHumidityPct, 0)} % HR · ${format(a.humidityRatioGKg, 2)} g/kg`,
      `Estado B: ${format(b.dryBulbC)} °C · ${format(b.relativeHumidityPct, 0)} % HR · ${format(b.humidityRatioGKg, 2)} g/kg`,
      `Cambios: ΔT ${deltas.dryBulbC >= 0 ? '+' : ''}${format(deltas.dryBulbC)} K · Δw ${deltas.humidityRatioGKg >= 0 ? '+' : ''}${format(deltas.humidityRatioGKg, 2)} g/kg · Δh ${deltas.moistAirEnthalpyKJkg >= 0 ? '+' : ''}${format(deltas.moistAirEnthalpyKJkg)} kJ/kg`,
      `Presión de cálculo: ${format(snapshot.pressurePa / 1000, 2)} kPa`,
    ]
  }

  if (snapshot.state) {
    const state = snapshot.state
    return [
      `Estado: ${format(state.dryBulbC)} °C · ${format(state.relativeHumidityPct, 0)} % HR`,
      `Bulbo húmedo: ${format(state.wetBulbC)} °C · Punto de rocío: ${format(state.dewPointC)} °C`,
      `Razón de humedad: ${format(state.humidityRatioGKg, 2)} g/kg · Entalpía: ${format(state.moistAirEnthalpyKJkg, 2)} kJ/kg`,
      `Volumen específico: ${format(state.moistAirVolumeM3kg, 3)} m³/kg`,
      `Presión de cálculo: ${format(snapshot.pressurePa / 1000, 2)} kPa`,
    ]
  }

  return [`Presión de cálculo: ${format(snapshot.pressurePa / 1000, 2)} kPa`]
}

function inlineSvgStyles(source: SVGSVGElement, clone: SVGSVGElement) {
  const sourceElements = [source, ...Array.from(source.querySelectorAll<SVGElement>('*'))]
  const cloneElements = [clone, ...Array.from(clone.querySelectorAll<SVGElement>('*'))]

  sourceElements.forEach((sourceElement, index) => {
    const cloneElement = cloneElements[index]
    if (!cloneElement) return
    const computed = getComputedStyle(sourceElement)
    for (const property of styleProperties) {
      const value = computed.getPropertyValue(property)
      if (value) cloneElement.style.setProperty(property, value)
    }
  })
}

function imageFromUrl(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('No se pudo representar la carta psicrométrica.'))
    image.src = url
  })
}

export async function renderPsychrometricChart(svg: SVGSVGElement, scale = 2): Promise<RenderedPsychrometricChart> {
  const clone = svg.cloneNode(true) as SVGSVGElement
  inlineSvgStyles(svg, clone)
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink')

  const viewBox = svg.viewBox.baseVal
  const sourceWidth = viewBox.width || svg.clientWidth || 760
  const sourceHeight = viewBox.height || svg.clientHeight || 430
  const width = Math.max(1, Math.round(sourceWidth * scale))
  const height = Math.max(1, Math.round(sourceHeight * scale))
  clone.setAttribute('width', String(width))
  clone.setAttribute('height', String(height))

  const serialized = new XMLSerializer().serializeToString(clone)
  const svgBlob = new Blob([serialized], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(svgBlob)

  try {
    const image = await imageFromUrl(url)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('El dispositivo no permite exportar la carta.')

    const dark = document.documentElement.dataset.theme === 'dark'
    context.fillStyle = dark ? '#0b1720' : '#ffffff'
    context.fillRect(0, 0, width, height)
    context.drawImage(image, 0, 0, width, height)

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((result) => result ? resolve(result) : reject(new Error('No se pudo crear la imagen PNG.')), 'image/png')
    })

    return { blob, dataUrl: canvas.toDataURL('image/png'), width, height }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function generatePsychrometricPdf(svg: SVGSVGElement, snapshot: PsychrometricExportSnapshot) {
  const rendered = await renderPsychrometricChart(svg, 2)
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  const margin = 14
  const pageWidth = 210
  const contentWidth = pageWidth - margin * 2
  const generated = new Date(snapshot.generatedAt ?? Date.now()).toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' })

  doc.setFillColor(20, 40, 52)
  doc.roundedRect(margin, 14, contentWidth, 35, 4, 4, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('IsiVoltPro Psicrometría', margin + 6, 27)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(205, 224, 233)
  doc.text('Carta psicrométrica y resumen técnico', margin + 6, 35)
  doc.text(`Generado: ${generated}`, margin + 6, 42)

  let y = 57
  doc.setTextColor(20, 40, 52)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(snapshot.comparison ? 'Proceso psicrométrico A → B' : 'Estado psicrométrico', margin, y)
  y += 7

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  for (const line of psychrometricSummaryLines(snapshot)) {
    const wrapped = doc.splitTextToSize(line, contentWidth) as string[]
    doc.text(wrapped, margin, y)
    y += wrapped.length * 4.5 + 1
  }

  y += 3
  const imageRatio = rendered.height / rendered.width
  const imageHeight = Math.min(120, contentWidth * imageRatio)
  doc.setDrawColor(213, 226, 232)
  doc.roundedRect(margin, y, contentWidth, imageHeight, 2, 2, 'D')
  doc.addImage(rendered.dataUrl, 'PNG', margin, y, contentWidth, imageHeight, undefined, 'FAST')
  y += imageHeight + 9

  doc.setFillColor(238, 246, 249)
  doc.roundedRect(margin, y, contentWidth, 20, 2, 2, 'F')
  doc.setTextColor(70, 91, 103)
  doc.setFontSize(8)
  const note = 'Documento generado localmente. Los resultados son aproximados y deben contrastarse con proyecto, normativa, fabricante e instrumentos calibrados.'
  doc.text(doc.splitTextToSize(note, contentWidth - 8) as string[], margin + 4, y + 6)

  doc.setDrawColor(220, 229, 234)
  doc.line(margin, 285, pageWidth - margin, 285)
  doc.setTextColor(90, 109, 121)
  doc.setFontSize(7.5)
  doc.text('IsiVoltPro Refrigeración · Psicrometría', margin, 290)
  doc.text('Página 1 de 1', pageWidth - margin, 290, { align: 'right' })

  return doc.output('blob')
}
