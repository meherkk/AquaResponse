export interface H3Cell {
  h3_index: string
  risk_normal: number
  risk_moderate_offshore: number
  risk_strong_santa_ana: number
  risk_extreme_santa_ana: number
  risk_post_rain: number
  haz_class_encoded: number
  dist_to_nearest_hydrant_km: number
  hydrant_density_5km: number
  dist_to_nearest_lake_km: number
  historical_fire_count: number
  centroid_lat: number
  centroid_lon: number
}

export interface WaterSource {
  id: string
  type: 'hydrant' | 'lake'
  name: string
  lat: number
  lon: number
}

export interface FireIncident {
  name: string
  lat: number
  lon: number
  acres_burned: number
  started: string
  counties: string
  structures_destroyed: number
}

export interface RouteResult {
  source: WaterSource
  distance_meters: number
  geometry: GeoJSON.LineString
}
