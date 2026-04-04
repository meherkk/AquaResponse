import type maplibregl from 'maplibre-gl'
import type { RouteResult } from '../../types/geo'

const ROUTE_SOURCE = 'route-lines'
const ROUTE_LAYER = 'route-lines-layer'

export function addRouteLines(map: maplibregl.Map, routes: RouteResult[]) {
  // Clean up existing
  if (map.getLayer(ROUTE_LAYER)) map.removeLayer(ROUTE_LAYER)
  if (map.getSource(ROUTE_SOURCE)) map.removeSource(ROUTE_SOURCE)

  if (routes.length === 0) return

  const geojson: GeoJSON.FeatureCollection = {
    type: 'FeatureCollection',
    features: routes.map((r, i) => ({
      type: 'Feature' as const,
      properties: {
        type: r.source.type,
        index: i,
      },
      geometry: r.geometry,
    })),
  }

  map.addSource(ROUTE_SOURCE, { type: 'geojson', data: geojson })

  map.addLayer({
    id: ROUTE_LAYER,
    type: 'line',
    source: ROUTE_SOURCE,
    paint: {
      'line-color': [
        'case',
        ['==', ['get', 'type'], 'hydrant'], '#38bdf8',
        '#1d4ed8',
      ],
      'line-width': 2,
      'line-dasharray': [4, 2],
    },
  })

  // Marching ants animation
  let offset = 0
  const interval = setInterval(() => {
    if (!map.getLayer(ROUTE_LAYER)) {
      clearInterval(interval)
      return
    }
    offset = (offset + 1) % 6
    map.setPaintProperty(ROUTE_LAYER, 'line-dasharray', [4, 2])
    // MapLibre doesn't support dash offset directly, shift the pattern
    map.setPaintProperty(ROUTE_LAYER, 'line-dasharray',
      offset < 3 ? [4, 2] : [2, 4]
    )
  }, 300)
}

export function clearRouteLines(map: maplibregl.Map) {
  if (map.getLayer(ROUTE_LAYER)) map.removeLayer(ROUTE_LAYER)
  if (map.getSource(ROUTE_SOURCE)) map.removeSource(ROUTE_SOURCE)
}
