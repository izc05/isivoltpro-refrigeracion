import { Route, Routes } from 'react-router-dom'
import './sprint-zero.css'
import './mobile-reference.css'
import { Shell } from './sprint0/shared'
import { HomePage, ToolsPage } from './sprint0/home-tools'
import { PtPage } from './sprint0/pt-ruler-page'
import { ConverterPage } from './sprint0/converter-page'
import { ChargePage, VacuumPage } from './sprint0/charge-vacuum-pages'
import { PsychrometricsPage } from './sprint0/psychrometrics-page'
import { DuctsPage } from './sprint0/ducts-page'
import { HydraulicsPage } from './sprint0/hydraulics-page'
import { VisualLibraryAdminPage } from './sprint0/visual-library-admin-page'
import { ComparePage, DiagnosticsPage, RefrigerantsPage } from './sprint0/data-pages'
import { InterventionsPage, LibraryPage, NotFoundPage, PlannedPage, ReportsPage, WorkHubPage } from './sprint0/work-pages'
import { SettingsPage } from './sprint0/settings-page'

export default function SprintZeroAppV2() {
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
    <Route path="/psychrometrics" element={<PsychrometricsPage />} />
    <Route path="/ducts" element={<DuctsPage />} />
    <Route path="/hydraulics" element={<HydraulicsPage />} />
    <Route path="/work" element={<WorkHubPage />} />
    <Route path="/library" element={<LibraryPage />} />
    <Route path="/visual-library" element={<VisualLibraryAdminPage />} />
    <Route path="/planned/:id" element={<PlannedPage />} />
    <Route path="/interventions" element={<InterventionsPage />} />
    <Route path="/reports" element={<ReportsPage />} />
    <Route path="/settings" element={<SettingsPage />} />
    <Route path="*" element={<NotFoundPage />} />
  </Routes></Shell>
}
