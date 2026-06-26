export function ProcessLegend({ label }: { label?: string }) {
  return <div className="psychro-process-legend">
    <span><i className="line saturation" />Saturación</span>
    <span><i className="line rh" />Humedad relativa</span>
    <span><i className="dot state" />Estado</span>
    {label && <strong>{label}</strong>}
  </div>
}
