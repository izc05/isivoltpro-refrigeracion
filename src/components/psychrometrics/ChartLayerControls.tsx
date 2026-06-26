export type PsychrometricChartLayers = {
  comfort: boolean
  enthalpy: boolean
  wetBulb: boolean
  specificVolume: boolean
}

export function ChartLayerControls({ layers, onChange }: { layers: PsychrometricChartLayers; onChange: (layers: PsychrometricChartLayers) => void }) {
  const options: Array<[keyof PsychrometricChartLayers, string]> = [
    ['comfort', 'Confort'],
    ['enthalpy', 'Entalpía'],
    ['wetBulb', 'Bulbo húmedo'],
    ['specificVolume', 'Volumen específico'],
  ]
  return <div className="psychro-layer-controls" aria-label="Capas de carta psicrométrica">
    {options.map(([key, label]) => <label key={key}>
      <input type="checkbox" checked={layers[key]} onChange={(event) => onChange({ ...layers, [key]: event.target.checked })} />
      <span>{label}</span>
    </label>)}
  </div>
}
