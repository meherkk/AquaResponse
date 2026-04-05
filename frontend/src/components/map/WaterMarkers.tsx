import type maplibregl from 'maplibre-gl'
import type { WaterSource } from '../../types/geo'

export function addWaterMarkers(map: maplibregl.Map, sources: WaterSource[]) {
  const sourceId = 'water-sources'

  // Remove existing if present
  if (map.getLayer('water-hydrants')) map.removeLayer('water-hydrants')
  if (map.getLayer('water-lakes')) map.removeLayer('water-lakes')
  if (map.getSource(sourceId)) map.removeSource(sourceId)

  if (sources.length === 0) return

  const geojson: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: sources.map((s) => ({
      type: 'Feature' as const,
      properties: { id: s.id, type: s.type, name: s.name },
      geometry: { type: 'Point' as const, coordinates: [s.lon, s.lat] },
    })),
  }

  map.addSource(sourceId, { type: 'geojson', data: geojson })

  map.addLayer({
    id: 'water-hydrants',
    type: 'circle',
    source: sourceId,
    filter: ['==', ['get', 'type'], 'hydrant'],
    paint: {
      'circle-radius': 4,
      'circle-color': '#38bdf8',
      'circle-stroke-width': 1,
      'circle-stroke-color': '#0c4a6e',
    },
  })

  map.addLayer({
    id: 'water-lakes',
    type: 'circle',
    source: sourceId,
    filter: ['==', ['get', 'type'], 'lake'],
    paint: {
      'circle-radius': 6,
      'circle-color': '#1d4ed8',
      'circle-stroke-width': 1,
      'circle-stroke-color': '#1e3a5f',
    },
  })
}
