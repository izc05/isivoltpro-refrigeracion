export const CHART_BOUNDS = { minT: -10, maxT: 50, minW: 0, maxW: 30 } as const

export type ChartPoint = { dryBulbC: number; humidityRatioGKg: number }

export function saturationPressurePa(t: number): number {
  if (!Number.isFinite(t)) return Number.NaN
  return t >= 0
    ? 611.21 * Math.exp((18.678 - t / 234.5) * (t / (257.14 + t)))
    : 611.15 * Math.exp((23.036 - t / 333.7) * (t / (279.82 + t)))
}

export function humidityRatioGKg(t: number, rhPct: number, pressurePa: number): number {
  const rh = Math.min(1, Math.max(0, rhPct / 100))
  const vapor = rh * saturationPressurePa(t)
  if (!Number.isFinite(vapor) || pressurePa <= vapor) return Number.NaN
  return 621.945 * vapor / (pressurePa - vapor)
}

export function relativeHumidityCurve(rhPct: number, pressurePa: number): ChartPoint[] {
  const points: ChartPoint[] = []
  for (let t = CHART_BOUNDS.minT; t <= CHART_BOUNDS.maxT; t += 1) {
    const w = humidityRatioGKg(t, rhPct, pressurePa)
    if (Number.isFinite(w) && w >= CHART_BOUNDS.minW && w <= CHART_BOUNDS.maxW) points.push({ dryBulbC: t, humidityRatioGKg: w })
  }
  return points
}

export function enthalpyLine(enthalpyKJkg: number): ChartPoint[] {
  const points: ChartPoint[] = []
  for (let t = CHART_BOUNDS.minT; t <= CHART_BOUNDS.maxT; t += 1) {
    const w = 1000 * (enthalpyKJkg - 1.006 * t) / (2501 + 1.86 * t)
    if (Number.isFinite(w) && w >= CHART_BOUNDS.minW && w <= CHART_BOUNDS.maxW) points.push({ dryBulbC: t, humidityRatioGKg: w })
  }
  return points
}
