import { useEffect, useRef, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import { Deck } from '@deck.gl/core'
import { createH3HexLayer } from './H3HexLayer'
import { addWaterMarkers } from './WaterMarkers'
import { addRouteLines, clearRouteLines } from './RouteLines'
import type { ScenarioKey } from '../../constants/scenarios'
import type { WaterSource, RouteResult } from '../../types/geo'
import type { IgnitionPoint } from '../../hooks/useIgnitionPoint'

interface AquaMapProps {
  cells: GeoJSON.FeatureCollection | null
  scenario: ScenarioKey
  waterSources: WaterSource[]
  ignitionPoint: IgnitionPoint | null
  routes: RouteResult[]
  onCellClick: (cell: GeoJSON.Feature | null) => void
  onMapClick: (lngLat: { lng: number; lat: number }) => void
}

export default function AquaMap({
  cells,
  scenario,
  waterSources,
  ignitionPoint,
  routes,
  onCellClick,
  onMapClick,
}: AquaMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const deckRef = useRef<Deck | null>(null)
  const markerRef = useRef<maplibregl.Marker | null>(null)

  // Stable refs for callbacks used in deck
  const onCellClickRef = useRef(onCellClick)
  onCellClickRef.current = onCellClick
  const onMapClickRef = useRef(onMapClick)
  onMapClickRef.current = onMapClick

  // Initialize map + deck
  useEffect(() => {
    if (!containerRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [-118.4, 34.1],
      zoom: 9,
      pitch: 45,
      bearing: -10,
      antialias: true,
    })

    map.addControl(new maplibregl.NavigationControl(), 'bottom-right')

    map.on('click', (e) => {
      onMapClickRef.current({ lng: e.lngLat.lng, lat: e.lngLat.lat })
    })

    mapRef.current = map

    map.on('load', () => {
      const deck = new Deck({
        parent: containerRef.current!,
        style: { position: 'absolute', top: '0', left: '0', zIndex: '1', pointerEvents: 'none' },
        initialViewState: {
          longitude: -118.4,
          latitude: 34.1,
          zoom: 9,
          pitch: 45,
          bearing: -10,
        },
        controller: false,
        layers: [],
        getTooltip: ({ object }: { object?: GeoJSON.Feature }) => {
          if (!object?.properties) return null
          const p = object.properties as Record<string, number>
          return {
            html: `<div class="font-mono text-xs">Risk: ${((p.risk_normal ?? 0) * 100).toFixed(0)}%</div>`,
            style: { background: '#111827', color: '#fff', border: '1px solid #1e2535', padding: '4px 8px' },
          }
        },
      })
      deckRef.current = deck

      // Sync deck viewport with map
      const syncViewport = () => {
        const center = map.getCenter()
        deck.setProps({
          initialViewState: {
            longitude: center.lng,
            latitude: center.lat,
            zoom: map.getZoom(),
            pitch: map.getPitch(),
            bearing: map.getBearing(),
          },
        })
      }

      map.on('move', syncViewport)
      map.on('zoom', syncViewport)
      map.on('rotate', syncViewport)
      map.on('pitch', syncViewport)
    })

    return () => {
      clearRouteLines(map)
      deckRef.current?.finalize()
      map.remove()
    }
  }, [])

  // Update hex layer
  useEffect(() => {
    if (!deckRef.current) return
    const layer = createH3HexLayer(cells, scenario, (obj) => onCellClickRef.current(obj))
    deckRef.current.setProps({ layers: [layer] })
  }, [cells, scenario])

  // Update water markers
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    addWaterMarkers(map, waterSources)
  }, [waterSources])

  // Update route lines
  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    addRouteLines(map, routes)
  }, [routes])

  // Ignition point marker
  const updateIgnitionMarker = useCallback((point: IgnitionPoint | null) => {
    if (markerRef.current) {
      markerRef.current.remove()
      markerRef.current = null
    }
    if (point && mapRef.current) {
      const el = document.createElement('div')
      el.className = 'ignition-marker'
      el.innerHTML = `<div class="w-4 h-4 bg-red-500 border-2 border-white rounded-full shadow-lg shadow-red-500/50 animate-pulse"></div>`
      markerRef.current = new maplibregl.Marker({ element: el })
        .setLngLat([point.lon, point.lat])
        .addTo(mapRef.current)
    }
  }, [])

  useEffect(() => {
    updateIgnitionMarker(ignitionPoint)
  }, [ignitionPoint, updateIgnitionMarker])

  return (
    <div ref={containerRef} className="absolute inset-0" />
  )
}
