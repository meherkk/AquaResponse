export const RISK_COLORS: [number, number, number][] = [
  [30, 58, 95],    // 0 - deep blue
  [21, 94, 117],   // 1
  [21, 128, 61],   // 2 - green
  [202, 138, 4],   // 3 - yellow
  [194, 65, 12],   // 4 - orange-red
  [127, 29, 29],   // 5 - crimson
]

export function riskColor(score: number): [number, number, number] {
  const idx = Math.min(5, Math.floor(score * 6))
  return RISK_COLORS[idx]
}

export const WATER_COLORS = {
  hydrant: [56, 189, 248] as [number, number, number],
  lake: [29, 78, 216] as [number, number, number],
}
