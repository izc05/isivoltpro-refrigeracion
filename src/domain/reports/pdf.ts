import { jsPDF } from 'jspdf'
import type { Intervention } from '../storage/db'

export function generateInterventionPdf(intervention: Intervention): Blob {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const margin = 14
  let y = 16
  const line = (label: string, value?: string | number) => {
    if (y > 276) { doc.addPage(); y = 16 }
    doc.setFont('helvetica', 'bold')
    doc.text(`${label}:`, margin, y)
    doc.setFont('helvetica', 'normal')
    const text = value === undefined || value === '' ? 'No indicado' : String(value)
    doc.text(doc.splitTextToSize(text, 130), margin + 44, y)
    y += 8
  }
  doc.setFontSize(16)
  doc.text('IsiVoltPro Refrigeración', margin, y)
  y += 9
  doc.setFontSize(12)
  doc.text(`Informe ${intervention.id}`, margin, y)
  y += 10
  line('Fecha', intervention.date)
  line('Cliente', intervention.clientName)
  line('Instalación', intervention.installationName)
  line('Equipo', intervention.equipmentLabel)
  line('Trabajo', intervention.workType)
  line('Estado', intervention.status)
  line('Presiones', intervention.pressures)
  line('Temperaturas', intervention.temperatures)
  line('Recalentamiento', intervention.superheatK?.toFixed(1))
  line('Subenfriamiento', intervention.subcoolingK?.toFixed(1))
  line('Vacío final', intervention.finalVacuum)
  line('Prueba estanqueidad', intervention.leakTest)
  line('Observaciones', intervention.observations)
  y += 4
  doc.setFontSize(9)
  doc.text(doc.splitTextToSize('Aviso técnico: informe orientativo. Debe interpretarse junto con mediciones completas, prueba de estanqueidad, carga por peso y documentación del fabricante.', 180), margin, y)
  return doc.output('blob')
}
