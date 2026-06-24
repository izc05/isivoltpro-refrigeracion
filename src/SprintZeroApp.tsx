import { Route, Routes } from 'react-router-dom'
import './sprint-zero.css'
import { Shell } from './sprint0/shared'
import { ChargePage, ConverterPage, HomePage, PtPage, ToolsPage, VacuumPage } from './sprint0/technical-pages'
import { ComparePage, DiagnosticsPage, RefrigerantsPage } from './sprint0/data-pages'
import { InterventionsPage, NotFoundPage, ReportsPage, SettingsPage } from './sprint0/work-pages'

export default function SprintZeroApp() {
  return <Shell><Routes>
    <Route path="/" element={<HomePage />} />
    <Route path="/tools" element={<ToolsPage />} />
    <Route path="/pt" element={<PtPage />} />
    <Route path="/superheat" element={<PtPage mode="superheat" />} />
    <Route path="/subcooling" element={<PtPage mode="subcooling" />} />
    <Route path="/converter" element={<ConverterPage />} />
    <Route path="/vacuum" element={<VacuumPage />} />
    <Route path="/charge" element={<ChargePage />} />
    <Route path="/refrigerants" element={<RefrigerantsPage />} />
    <Route path="/compare" element={<ComparePage />} />
    <Route path="/diagnostics" element={<DiagnosticsPage />} />
    <Route path="/interventions" element={<InterventionsPage />} />
    <Route path="/reports" element={<ReportsPage />} />
    <Route path="/settings" element={<SettingsPage />} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes></Shell>
}
