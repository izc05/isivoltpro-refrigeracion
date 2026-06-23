import { describe, expect, it } from 'vitest'
import { calculateAdditionalCharge } from '../domain/charge'
import { runDiagnosticRules } from '../domain/diagnostics/rules'
import { db, exportBackup, importBackup, newId } from '../domain/storage/db'
import { generateInterventionPdf } from '../domain/reports/pdf'

describe('app workflows', () => {
  it('calculates additional charge without negative length', () => {
    expect(calculateAdditionalCharge(900, 5, 3, 20)).toEqual({ additionalLengthM: 0, additionalChargeG: 0, totalChargeG: 900 })
    expect(calculateAdditionalCharge(900, 5, 8, 20).totalChargeG).toBe(960)
  })
  it('returns transparent diagnostic rules', () => {
    const findings = runDiagnosticRules({ mode: 'frio', superheatK: 16, subcoolingK: 2 })
    expect(findings[0].cause).toContain('Posible')
    expect(findings[0].checks.join(' ')).toContain('fabricante')
  })
  it('persists and exports IndexedDB records', async () => {
    await db.delete(); await db.open()
    await db.interventions.put({ id: newId('int'), date: '2026-06-23', clientName: 'Cliente', workType: 'Revisión', status: 'borrador', photos: [], createdAt: 'now', updatedAt: 'now' })
    const backup = await exportBackup()
    expect(backup.interventions).toHaveLength(1)
    await importBackup(backup)
    expect(await db.interventions.count()).toBe(1)
  })
  it('generates a PDF blob', () => {
    const blob = generateInterventionPdf({ id: 'INT-1', date: '2026-06-23', clientName: 'Cliente', workType: 'Mantenimiento', status: 'terminada', photos: [], createdAt: 'now', updatedAt: 'now' })
    expect(blob.type).toBe('application/pdf')
    expect(blob.size).toBeGreaterThan(1000)
  })
})
