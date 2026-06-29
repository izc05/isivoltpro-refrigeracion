import { describe, expect, it } from 'vitest'
import { createChartViewBox, fitChartPoints, zoomChartViewport } from '../sprint0/psychrometric-chart-viewport'

describe('psychrometric chart viewport', () => {
  it('creates a centered half-size view box at 200 percent zoom', () => {
    const viewBox = createChartViewBox({ zoom: 2, centerX: 380, centerY: 215 }, 760, 430)
    expect(viewBox).toEqual({ x: 190, y: 107.5, width: 380, height: 215 })
  })

  it('clamps the view box inside the chart', () => {
    const viewBox = createChartViewBox({ zoom: 4, centerX: -100, centerY: 900 }, 760, 430)
    expect(viewBox.x).toBe(0)
    expect(viewBox.y + viewBox.height).toBe(430)
  })

  it('keeps the selected focus stable while zooming', () => {
    const viewport = zoomChartViewport({ zoom: 1, centerX: 380, centerY: 215 }, 2, 200, 100)
    expect(viewport.zoom).toBe(2)
    expect(viewport.centerX).toBe(290)
    expect(viewport.centerY).toBe(157.5)
  })

  it('fits two process points with useful zoom and midpoint', () => {
    const viewport = fitChartPoints([{ x: 200, y: 160 }, { x: 500, y: 280 }], 760, 430, 50)
    expect(viewport.zoom).toBeGreaterThan(1)
    expect(viewport.centerX).toBe(350)
    expect(viewport.centerY).toBe(220)
  })
})
