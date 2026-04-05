import type maplibregl from 'maplibre-gl'
import type { WaterSource } from '../../types/geo'

const sourceId = 'water-sources'
const highlightLayerIds = ['water-hydrants-highlight', 'water-lakes-highlight'] as const

function removeHighlightLayers(map: maplibregl.Map) {
  for (const id of highlightLayerIds) {
    if (map.getLayer(id)) map.removeLayer(id)
  }
}

function addHighlightLayers(map: maplibregl.Map, highlightedIds: string[]) {
  if (highlightedIds.length === 0) return
  if (!map.getSource(sourceId)) return

  map.addLayer({
    id: 'water-hydrants-highlight',
    type: 'circle',
    source: sourceId,
    filter: ['all',
      ['==', ['get', 'type'], 'hydrant'],
      ['in', ['get', 'id'], ['literal', highlightedIds]],
    ],
    paint: {
      'circle-radius': 9,
      'circle-color': '#38bdf8',
      'circle-opacity': 1,
      'circle-stroke-width': 3,
      'circle-stroke-color': '#ffffff',
    },
  })

  map.addLayer({
    id: 'water-lakes-highlight',
    type: 'circle',
    source: sourceId,
    filter: ['all',
      ['==', ['get', 'type'], 'lake'],
      ['in', ['get', 'id'], ['literal', highlightedIds]],
    ],
    paint: {
      'circle-radius': 11,
      'circle-color': '#1d4ed8',
      'circle-opacity': 1,
      'circle-stroke-width': 3,
      'circle-stroke-color': '#ffffff',
    },
  })
}

export function addWaterMarkers(
  map: maplibregl.Map,
  sources: WaterSource[],
  highlightedIds?: string[],
) {
  // Remove existing if present
  removeHighlightLayers(map)
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

  if (highlightedIds && highlightedIds.length > 0) {
    addHighlightLayers(map, highlightedIds)
  }
}

export function updateHighlightedMarkers(
  map: maplibregl.Map,
  highlightedIds: string[],
) {
  removeHighlightLayers(map)
  addHighlightLayers(map, highlightedIds)
}
