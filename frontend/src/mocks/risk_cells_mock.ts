import type { ScenarioKey } from '../constants/scenarios'

// 50 fake H3 cells spread across LA basin area
// Using resolution-7 H3 indices in the LA region
const LA_H3_INDICES = [
  '872830828ffffff', '87283082affffff', '87283082effffff', '872830820ffffff',
  '872830821ffffff', '872830822ffffff', '872830823ffffff', '872830824ffffff',
  '872830825ffffff', '872830826ffffff', '872830870ffffff', '872830871ffffff',
  '872830872ffffff', '872830873ffffff', '872830874ffffff', '872830875ffffff',
  '872830876ffffff', '8728308a0ffffff', '8728308a1ffffff', '8728308a2ffffff',
  '8728308a3ffffff', '8728308a4ffffff', '8728308a5ffffff', '8728308a6ffffff',
  '8728308b0ffffff', '8728308b1ffffff', '8728308b2ffffff', '8728308b3ffffff',
  '8728308b4ffffff', '8728308b5ffffff', '8728308b6ffffff', '872830880ffffff',
  '872830881ffffff', '872830882ffffff', '872830883ffffff', '872830884ffffff',
  '872830885ffffff', '872830886ffffff', '872830890ffffff', '872830891ffffff',
  '872830892ffffff', '872830893ffffff', '872830894ffffff', '872830895ffffff',
  '872830896ffffff', '8728308c0ffffff', '8728308c1ffffff', '8728308c2ffffff',
  '8728308c3ffffff', '8728308c4ffffff',
]

function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return s / 2147483647
  }
}

function generateCellProperties(index: number) {
  const rand = seededRandom(index * 137 + 42)
  const baseLat = 34.0 + (rand() - 0.5) * 0.4
  const baseLon = -118.3 + (rand() - 0.5) * 0.6

  const risk_normal = rand() * 0.6 + 0.1
  const risk_moderate_offshore = Math.min(1, risk_normal + rand() * 0.2)
  const risk_strong_santa_ana = Math.min(1, risk_normal + rand() * 0.4)
  const risk_extreme_santa_ana = Math.min(1, risk_normal + rand() * 0.6)
  const risk_post_rain = Math.max(0, risk_normal - rand() * 0.3)

  return {
    h3_index: LA_H3_INDICES[index],
    risk_normal: Math.round(risk_normal * 1000) / 1000,
    risk_moderate_offshore: Math.round(risk_moderate_offshore * 1000) / 1000,
    risk_strong_santa_ana: Math.round(risk_strong_santa_ana * 1000) / 1000,
    risk_extreme_santa_ana: Math.round(risk_extreme_santa_ana * 1000) / 1000,
    risk_post_rain: Math.round(risk_post_rain * 1000) / 1000,
    haz_class_encoded: Math.floor(rand() * 4),
    dist_to_nearest_hydrant_km: Math.round(rand() * 8 * 100) / 100,
    hydrant_density_5km: Math.floor(rand() * 30),
    dist_to_nearest_lake_km: Math.round(rand() * 15 * 100) / 100,
    historical_fire_count: Math.floor(rand() * 12),
    centroid_lat: baseLat,
    centroid_lon: baseLon,
  }
}

const features = LA_H3_INDICES.map((_, i) => {
  const props = generateCellProperties(i)
  return {
    type: 'Feature' as const,
    properties: props,
    geometry: {
      type: 'Point' as const,
      coordinates: [props.centroid_lon, props.centroid_lat],
    },
  }
})

export const MOCK_RISK_CELLS: GeoJSON.FeatureCollection = {
  type: 'FeatureCollection',
  features,
}

export function getMockRiskForScenario(_scenario: ScenarioKey) {
  return MOCK_RISK_CELLS
}
