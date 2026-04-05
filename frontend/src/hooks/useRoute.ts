import { API_BASE } from '../constants/api'
import type { RouteResult, WaterSource } from '../types/geo'

interface RouteResponseEntry {
  id: string
  type: WaterSource['type']
  name: string
  lat: number
  lon: number
  distance_km: number
  geometry: GeoJSON.LineString
}

interface RouteResponse {
  routes: RouteResponseEntry[]
  message: string
}

export async function fetchRoute(lat: number, lon: number): Promise<RouteResult[]> {
  const res = await fetch(`${API_BASE}/route`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat, lon, n: 3 }),
  })

  if (!res.ok) throw new Error(`Route request failed (${res.status})`)

  const data = (await res.json()) as RouteResponse

  return data.routes.map((r) => ({
    source: { id: r.id, type: r.type, name: r.name, lat: r.lat, lon: r.lon },
    distance_meters: r.distance_km * 1000,
    geometry: r.geometry,
  }))
}
