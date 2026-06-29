export type ChartViewport = {
  zoom: number
  centerX: number
  centerY: number
}

export type ChartViewBox = {
  x: number
  y: number
  width: number
  height: number
}

export const MIN_CHART_ZOOM = 1
export const MAX_CHART_ZOOM = 4

export function clampChartZoom(zoom: number) {
  if (!Number.isFinite(zoom)) return MIN_CHART_ZOOM
  return Math.min(MAX_CHART_ZOOM, Math.max(MIN_CHART_ZOOM, zoom))
}

export function createChartViewBox(viewport: ChartViewport, chartWidth: number, chartHeight: number): ChartViewBox {
  const zoom = clampChartZoom(viewport.zoom)
  const width = chartWidth / zoom
  const height = chartHeight / zoom
  const centerX = Math.min(chartWidth - width / 2, Math.max(width / 2, viewport.centerX))
  const centerY = Math.min(chartHeight - height / 2, Math.max(height / 2, viewport.centerY))
  return { x: centerX - width / 2, y: centerY - height / 2, width, height }
}

export function zoomChartViewport(viewport: ChartViewport, nextZoom: number, focusX: number, focusY: number): ChartViewport {
  const zoom = clampChartZoom(nextZoom)
  if (zoom === viewport.zoom) return viewport
  const scale = viewport.zoom / zoom
  return {
    zoom,
    centerX: focusX + (viewport.centerX - focusX) * scale,
    centerY: focusY + (viewport.centerY - focusY) * scale,
  }
}

export function fitChartPoints(points: Array<{ x: number; y: number }>, chartWidth: number, chartHeight: number, padding = 90): ChartViewport {
  if (points.length === 0) return { zoom: 1, centerX: chartWidth / 2, centerY: chartHeight / 2 }
  const minX = Math.min(...points.map((point) => point.x))
  const maxX = Math.max(...points.map((point) => point.x))
  const minY = Math.min(...points.map((point) => point.y))
  const maxY = Math.max(...points.map((point) => point.y))
  const contentWidth = Math.max(1, maxX - minX + padding * 2)
  const contentHeight = Math.max(1, maxY - minY + padding * 2)
  const zoom = clampChartZoom(Math.min(chartWidth / contentWidth, chartHeight / contentHeight))
  return { zoom, centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2 }
}
