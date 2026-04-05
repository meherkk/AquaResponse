export const SCENARIOS = [
  { key: 'risk_normal', label: 'Normal Summer', short: 'NORM' },
  { key: 'risk_moderate_offshore', label: 'Moderate Offshore', short: 'MOD' },
  { key: 'risk_strong_santa_ana', label: 'Strong Santa Ana', short: 'SSA' },
  { key: 'risk_extreme_santa_ana', label: 'Extreme Santa Ana', short: 'ESA' },
  { key: 'risk_post_rain', label: 'Post-Rain Green-Up', short: 'PRG' },
] as const

export type ScenarioKey = typeof SCENARIOS[number]['key']
