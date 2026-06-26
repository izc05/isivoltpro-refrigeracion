import type { ChartDataset } from 'chart.js'

export function comfortZoneDataset(): ChartDataset<'scatter'> {
  return {
    label: 'Zona de confort orientativa',
    data: [
      { x: 20, y: 5.8 },
      { x: 26, y: 5.8 },
      { x: 26, y: 12.2 },
      { x: 20, y: 12.2 },
      { x: 20, y: 5.8 },
    ],
    showLine: true,
    fill: true,
    borderColor: 'rgba(34, 211, 238, .38)',
    backgroundColor: 'rgba(34, 211, 238, .10)',
    pointRadius: 0,
    borderWidth: 1.5,
  }
}
