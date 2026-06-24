import { jsPDF } from 'jspdf'
import type { Intervention } from '../storage/db'

const PAGE_WIDTH = 210
const PAGE_HEIGHT = 297
const MARGIN = 14
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2
const BRAND = { r: 0, g: 128, b: 149 }
const DARK = { r: 20, g: 40, b: 52 }
const MUTED = { r: 90, g: 109, b: 121 }
const LIGHT = { r: 238, g: 246, b: 249 }

function printable(value?: string | number | null) {
  return value === undefined || value === null || value === '' ? 'No indicado' : String(value)
}

function safeFilename(value: string) {
  return value.replace(/[^a-z0-9áéíóúüñ_-]+/gi, '-').replace(/^-+|-+$/g, '')
}

export function interventionPdfFilename(intervention: Intervention) {
  return `IsiVoltPro-${intervention.date}-${safeFilename(intervention.clientName) || 'intervencion'}.pdf`
}

export function generateInterventionPdf(intervention: Intervention): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true })
  let y = 14

  const addPage = () => {
    doc.addPage()
    y = 16
  }

  const ensure = (height: number) => {
    if (y + height > PAGE_HEIGHT - 18) addPage()
  }

  const wrappedText = (text: string, width: number) => doc.splitTextToSize(text, width) as string[]

  const sectionTitle = (title: string) => {
    ensure(13)
    doc.setFillColor(BRAND.r, BRAND.g, BRAND.b)
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 8, 2, 2, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.text(title.toUpperCase(), MARGIN + 4, y + 5.4)
    y += 12
  }

  const field = (label: string, value?: string | number | null) => {
    const labelWidth = 48
    const text = printable(value)
    const lines = wrappedText(text, CONTENT_WIDTH - labelWidth - 4)
    const height = Math.max(7, lines.length * 5 + 2)
    ensure(height)

    doc.setDrawColor(218, 228, 234)
    doc.setFillColor(248, 251, 252)
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, height, 1.5, 1.5, 'FD')
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8.5)
    doc.text(label, MARGIN + 3, y + 4.8)
    doc.setTextColor(DARK.r, DARK.g, DARK.b)
    doc.setFont('helvetica', 'normal')
    doc.text(lines, MARGIN + labelWidth, y + 4.8)
    y += height + 2
  }

  const twoFields = (
    leftLabel: string,
    leftValue?: string | number | null,
    rightLabel?: string,
    rightValue?: string | number | null,
  ) => {
    const gap = 4
    const width = (CONTENT_WIDTH - gap) / 2
    const leftLines = wrappedText(`${leftLabel}: ${printable(leftValue)}`, width - 6)
    const rightLines = wrappedText(`${rightLabel ?? ''}: ${printable(rightValue)}`, width - 6)
    const height = Math.max(11, Math.max(leftLines.length, rightLines.length) * 4.5 + 5)
    ensure(height)

    const draw = (x: number, label: string, value?: string | number | null) => {
      doc.setDrawColor(218, 228, 234)
      doc.setFillColor(248, 251, 252)
      doc.roundedRect(x, y, width, height, 1.5, 1.5, 'FD')
      doc.setFontSize(7.5)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(MUTED.r, MUTED.g, MUTED.b)
      doc.text(label.toUpperCase(), x + 3, y + 4)
      doc.setFontSize(9.5)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(DARK.r, DARK.g, DARK.b)
      doc.text(wrappedText(printable(value), width - 6), x + 3, y + 8.5)
    }

    draw(MARGIN, leftLabel, leftValue)
    draw(MARGIN + width + gap, rightLabel ?? '', rightValue)
    y += height + 3
  }

  const paragraph = (text: string) => {
    const lines = wrappedText(text, CONTENT_WIDTH - 8)
    const height = lines.length * 4.8 + 7
    ensure(height)
    doc.setFillColor(LIGHT.r, LIGHT.g, LIGHT.b)
    doc.roundedRect(MARGIN, y, CONTENT_WIDTH, height, 2, 2, 'F')
    doc.setTextColor(DARK.r, DARK.g, DARK.b)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.text(lines, MARGIN + 4, y + 5)
    y += height + 3
  }

  const generatedLabel = new Date().toLocaleString('es-ES', {
    dateStyle: 'short',
    timeStyle: 'short',
  })

  doc.setFillColor(DARK.r, DARK.g, DARK.b)
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 42, 4, 4, 'F')
  doc.setFillColor(BRAND.r, BRAND.g, BRAND.b)
  doc.circle(MARGIN + 15, y + 21, 9, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('IV', MARGIN + 10.5, y + 24)
  doc.setFontSize(20)
  doc.text('IsiVoltPro Refrigeración', MARGIN + 29, y + 15)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Informe técnico de intervención', MARGIN + 29, y + 23)
  doc.setTextColor(202, 220, 230)
  doc.setFontSize(8.5)
  doc.text(`Generado: ${generatedLabel}`, MARGIN + 29, y + 31)
  doc.text(`Referencia: ${intervention.id}`, MARGIN + 29, y + 36)
  y += 48

  twoFields('Fecha intervención', intervention.date, 'Estado', intervention.status)
  twoFields('Cliente', intervention.clientName, 'Técnico', intervention.technician)
  twoFields('Instalación', intervention.installationName, 'Equipo / ubicación', intervention.equipmentLabel)
  twoFields('Trabajo', intervention.workType, 'Refrigerante', intervention.refrigerant)

  sectionTitle('Mediciones y comprobaciones')
  field('Presiones', intervention.pressures)
  field('Temperaturas', intervention.temperatures)
  twoFields(
    'Recalentamiento',
    intervention.superheatK === undefined ? undefined : `${intervention.superheatK.toFixed(1)} K`,
    'Subenfriamiento',
    intervention.subcoolingK === undefined ? undefined : `${intervention.subcoolingK.toFixed(1)} K`,
  )
  twoFields('Vacío final', intervention.finalVacuum, 'Duración / estabilidad', intervention.vacuumTestDuration)
  field('Prueba de estanqueidad', intervention.leakTest)
  field('Consumo eléctrico', intervention.consumption)

  sectionTitle('Gestión de refrigerante')
  twoFields('Refrigerante recuperado', intervention.recoveredRefrigerant, 'Refrigerante añadido', intervention.addedRefrigerant)

  sectionTitle('Diagnóstico y trabajo realizado')
  field('Diagnóstico', intervention.diagnosis)
  field('Material utilizado', intervention.materials)
  field('Observaciones / trabajo', intervention.observations)
  field('Conclusión', intervention.conclusion)

  if (intervention.photos.length > 0) {
    sectionTitle('Fotografías')
    let added = 0
    for (const photo of intervention.photos.slice(0, 6)) {
      if (!photo.startsWith('data:image/')) continue
      ensure(57)
      try {
        const format = photo.startsWith('data:image/png') ? 'PNG' : 'JPEG'
        doc.addImage(photo, format, MARGIN, y, 82, 52, undefined, 'FAST')
        added += 1
        y += 57
      } catch {
        // An invalid image must not prevent the report from being generated.
      }
    }
    if (added === 0) paragraph(`${intervention.photos.length} fotografía(s) asociadas, no insertadas por formato no compatible.`)
  }

  sectionTitle('Firma y cierre')
  ensure(36)
  doc.setDrawColor(190, 205, 214)
  doc.roundedRect(MARGIN, y, CONTENT_WIDTH, 30, 2, 2, 'D')
  doc.setTextColor(MUTED.r, MUTED.g, MUTED.b)
  doc.setFontSize(8)
  doc.text('FIRMA DEL TÉCNICO / VALIDACIÓN MANUAL', MARGIN + 4, y + 5)
  if (intervention.signature?.startsWith('data:image/')) {
    try {
      doc.addImage(intervention.signature, 'PNG', MARGIN + 4, y + 7, 55, 18, undefined, 'FAST')
    } catch {
      // Leave the generic signature area empty.
    }
  }
  y += 35

  paragraph('Aviso técnico: el informe documenta los datos registrados por el técnico. Las conclusiones deben interpretarse junto con la placa, el manual del fabricante, las mediciones completas, el procedimiento de estanqueidad, la carga por peso y la normativa aplicable.')

  const pages = doc.getNumberOfPages()
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page)
    doc.setDrawColor(220, 229, 234)
    doc.line(MARGIN, PAGE_HEIGHT - 12, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 12)
    doc.setTextColor(MUTED.r, MUTED.g, MUTED.b)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.text('IsiVoltPro Refrigeración · Documento generado localmente', MARGIN, PAGE_HEIGHT - 7)
    doc.text(`Página ${page} de ${pages}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 7, { align: 'right' })
  }

  return doc.output('blob')
}
