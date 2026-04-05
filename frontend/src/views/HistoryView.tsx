import { useEffect, useRef, useState, useCallback } from 'react'
import maplibregl from 'maplibre-gl'
import { useFireIncidents } from '../hooks/useFireIncidents'
import { MOCK_RISK_CELLS } from '../mocks/risk_cells_mock'
import { riskColor } from '../constants/colors'
import type { FireIncident } from '../types/geo'
import { Flame, History } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'

const MIN_YEAR = 2013
const MAX_YEAR = 2025

function getIncidentYear(incident: FireIncident): number {
  return new Date(incident.started).getFullYear()
}

// Color by year: older = cooler, recent = warmer
function yearColor(year: number): string {
  const t = (year - MIN_YEAR) / (MAX_YEAR - MIN_YEAR)
  // interpolate from steel blue → orange → crimson
  if (t < 0.5) {
    const s = t * 2
    const r = Math.round(56 + s * (234 - 56))
    const g = Math.round(130 + s * (88 - 130))
    const b = Math.round(246 + s * (36 - 246))
    return `rgb(${r},${g},${b})`
  } else {
    const s = (t - 0.5) * 2
    const r = Math.round(234 + s * (153 - 234))
    const g = Math.round(88 + s * (27 - 88))
    const b = Math.round(36 + s * (27 - 36))
    return `rgb(${r},${g},${b})`
  }
}

function acresLabel(acres: number): string {
  if (acres >= 1000) return `${(acres / 1000).toFixed(1)}k`
  return acres.toFixed(0)
}

export default function HistoryView() {
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const popupRef = useRef<maplibregl.Popup | null>(null)
  const { incidents, loading, error } = useFireIncidents()
  const [year, setYear] = useState(MAX_YEAR)
  const navigate = useNavigate()
  const location = useLocation()

  // Filter incidents for selected year
  const filtered = incidents.filter((i) => getIncidentYear(i) === year)

  // Stats for the selected year
  const totalAcres = filtered.reduce((s, i) => s + i.acres_burned, 0)
  const totalStructures = filtered.reduce((s, i) => s + i.structures_destroyed, 0)

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current) return

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center: [-118.25, 34.05],
      zoom: 8.5,
      pitch: 0,
      bearing: 0,
      antialias: true,
    })

    map.addControl(new maplibregl.NavigationControl(), 'bottom-right')
    mapRef.current = map

    map.on('load', () => {
      // Add risk heatmap layer (H3 cells as polygons at 30% opacity)
      const hexFeatures = MOCK_RISK_CELLS.features.map((f) => {
        const score = (f.properties as Record<string, number>)['risk_extreme_santa_ana'] ?? 0
        const [r, g, b] = riskColor(score)
        return { ...f, properties: { ...f.properties, fill_color: `rgb(${r},${g},${b})` } }
      })

      map.addSource('risk-hex', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: hexFeatures },
      })

      map.addLayer({
        id: 'risk-hex-fill',
        type: 'fill',
        source: 'risk-hex',
        paint: {
          'fill-color': ['get', 'fill_color'],
          'fill-opacity': 0.3,
        },
      })

      // Incident circles source (empty to start — updated reactively)
      map.addSource('incidents', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })

      map.addLayer({
        id: 'incidents-glow',
        type: 'circle',
        source: 'incidents',
        paint: {
          'circle-color': ['get', 'color'],
          'circle-radius': ['get', 'radius'],
          'circle-opacity': 0.15,
          'circle-blur': 0.8,
        },
      })

      map.addLayer({
        id: 'incidents-fill',
        type: 'circle',
        source: 'incidents',
        paint: {
          'circle-color': ['get', 'color'],
          'circle-radius': ['*', ['get', 'radius'], 0.55],
          'circle-opacity': 0.85,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 0.5,
          'circle-stroke-opacity': 0.4,
        },
      })

      // Click handler
      map.on('click', 'incidents-fill', (e) => {
        const feature = e.features?.[0]
        if (!feature) return
        const p = feature.properties as Record<string, string | number>

        popupRef.current?.remove()
        popupRef.current = new maplibregl.Popup({
          closeButton: true,
          closeOnClick: false,
          className: 'aqua-popup',
          maxWidth: '280px',
        })
          .setLngLat(e.lngLat)
          .setHTML(`
            <div style="font-family:monospace;font-size:11px;color:#e2e8f0;line-height:1.6;">
              <div style="font-size:13px;font-weight:700;color:#f97316;margin-bottom:6px;text-transform:uppercase;letter-spacing:0.05em;">
                ${p.name}
              </div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;">
                <span style="color:#94a3b8;">Date</span>
                <span>${p.started}</span>
                <span style="color:#94a3b8;">Acres</span>
                <span>${Number(p.acres_burned).toLocaleString()}</span>
                <span style="color:#94a3b8;">County</span>
                <span>${p.counties}</span>
                <span style="color:#94a3b8;">Structures</span>
                <span>${Number(p.structures_destroyed).toLocaleString()}</span>
              </div>
            </div>
          `)
          .addTo(map)
      })

      map.on('mouseenter', 'incidents-fill', () => {
        map.getCanvas().style.cursor = 'pointer'
      })
      map.on('mouseleave', 'incidents-fill', () => {
        map.getCanvas().style.cursor = ''
      })
    })

    return () => {
      popupRef.current?.remove()
      map.remove()
    }
  }, [])

  // Update incident circles when year or data changes
  const updateIncidents = useCallback((incidentList: FireIncident[], selectedYear: number) => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return

    const yearFiltered = incidentList.filter((i) => getIncidentYear(i) === selectedYear)
    const maxAcres = Math.max(...incidentList.map((i) => i.acres_burned), 1)

    const features: GeoJSON.Feature[] = yearFiltered.map((inc) => ({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [inc.lon, inc.lat] },
      properties: {
        name: inc.name,
        started: inc.started,
        acres_burned: inc.acres_burned,
        counties: inc.counties,
        structures_destroyed: inc.structures_destroyed,
        color: yearColor(getIncidentYear(inc)),
        // radius 6–36px scaled by sqrt of acres relative to max
        radius: 6 + 30 * Math.sqrt(inc.acres_burned / maxAcres),
      },
    }))

    const src = map.getSource('incidents') as maplibregl.GeoJSONSource | undefined
    src?.setData({ type: 'FeatureCollection', features })
  }, [])

  useEffect(() => {
    updateIncidents(incidents, year)
  }, [incidents, year, updateIncidents])

  // Handle map style not yet loaded — retry once style loads
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (map.isStyleLoaded()) {
      updateIncidents(incidents, year)
    } else {
      const onLoad = () => updateIncidents(incidents, year)
      map.once('load', onLoad)
      return () => { map.off('load', onLoad) }
    }
  }, [incidents, year, updateIncidents])

  return (
    <div className="flex flex-col h-screen bg-command-bg">
      {/* Compact header */}
      <header className="flex items-center justify-between h-14 px-4 bg-command-surface border-b border-command-border shrink-0 z-50">
        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-orange-500" />
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold tracking-wide text-white">AQUARESPONSE</span>
            <span className="text-[10px] font-medium tracking-[0.15em] text-command-muted uppercase">Fire Command System</span>
          </div>
        </div>

        {/* Year stats */}
        <div className="flex items-center gap-6 font-mono text-xs">
          <div className="text-center">
            <div className="text-command-muted uppercase tracking-widest text-[10px]">Incidents</div>
            <div className="text-white text-sm font-bold">{filtered.length}</div>
          </div>
          <div className="text-center">
            <div className="text-command-muted uppercase tracking-widest text-[10px]">Acres</div>
            <div className="text-orange-400 text-sm font-bold">{acresLabel(totalAcres)}</div>
          </div>
          <div className="text-center">
            <div className="text-command-muted uppercase tracking-widest text-[10px]">Structures</div>
            <div className="text-red-400 text-sm font-bold">{totalStructures.toLocaleString()}</div>
          </div>
        </div>

        {/* Nav */}
        <div className="flex items-center gap-1">
          {[
            { path: '/', label: 'MAP' },
            { path: '/planning', label: 'PLAN' },
            { path: '/history', label: 'HISTORY' },
          ].map((item) => {
            const active = location.pathname === item.path
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono tracking-wide border transition-colors ${
                  active
                    ? 'border-sky-500/60 bg-sky-500/10 text-sky-400'
                    : 'border-command-border bg-transparent text-command-muted hover:text-white hover:border-command-muted'
                }`}
              >
                {item.label}
              </button>
            )
          })}
        </div>
      </header>

      {/* Map */}
      <div className="relative flex-1">
        <div ref={mapContainerRef} className="absolute inset-0" />

        {/* Loading overlay */}
        {loading && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-command-surface/90 backdrop-blur border border-command-border px-4 py-2 font-mono text-xs text-command-muted">
            Loading incident data...
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-red-950/90 border border-red-800 px-4 py-2 font-mono text-xs text-red-400">
            Backend unavailable — showing risk heatmap only
          </div>
        )}

        {/* Year slider panel */}
        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-10 bg-command-surface/95 backdrop-blur border border-command-border px-6 py-4 w-[480px]">
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-xs text-command-muted uppercase tracking-widest flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" />
              Fire History
            </span>
            <span className="font-mono text-lg font-bold text-white">{year}</span>
          </div>

          <input
            type="range"
            min={MIN_YEAR}
            max={MAX_YEAR}
            step={1}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-full h-1.5 appearance-none bg-command-border rounded cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-4
              [&::-webkit-slider-thumb]:h-4
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-orange-500
              [&::-webkit-slider-thumb]:border-2
              [&::-webkit-slider-thumb]:border-white
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-moz-range-thumb]:w-4
              [&::-moz-range-thumb]:h-4
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-orange-500
              [&::-moz-range-thumb]:border-2
              [&::-moz-range-thumb]:border-white
              [&::-moz-range-thumb]:cursor-pointer"
          />

          {/* Year ticks */}
          <div className="flex justify-between mt-1.5">
            {Array.from({ length: MAX_YEAR - MIN_YEAR + 1 }, (_, i) => MIN_YEAR + i).map((y) => (
              <button
                key={y}
                onClick={() => setYear(y)}
                className={`font-mono text-[9px] transition-colors ${
                  y === year ? 'text-orange-400 font-bold' : 'text-command-muted/50 hover:text-command-muted'
                }`}
              >
                {y === year ? y : y % 2 === 1 ? "'" + String(y).slice(2) : '·'}
              </button>
            ))}
          </div>
        </div>

        {/* Legend */}
        <div className="absolute top-4 right-4 z-10 bg-command-surface/90 backdrop-blur border border-command-border p-3 font-mono text-xs">
          <div className="text-command-muted uppercase tracking-widest text-[10px] mb-2">Legend</div>
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <div className="w-4 h-0.5 bg-gradient-to-r from-sky-400 to-orange-500 to-red-700" />
              <span className="text-command-muted">Incident (older → newer)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-2 rounded-full bg-blue-500/40" />
              <span className="text-command-muted">Risk heatmap (ESA)</span>
            </div>
            <div className="mt-2 text-command-muted/60 text-[10px]">Circle size = acres burned</div>
          </div>
        </div>
      </div>

      {/* Popup styles injected globally */}
      <style>{`
        .aqua-popup .maplibregl-popup-content {
          background: #0f1623;
          border: 1px solid #1e2d3d;
          border-radius: 2px;
          padding: 12px 14px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.6);
        }
        .aqua-popup .maplibregl-popup-tip {
          border-top-color: #1e2d3d;
        }
        .aqua-popup .maplibregl-popup-close-button {
          color: #64748b;
          font-size: 16px;
          padding: 4px 8px;
        }
        .aqua-popup .maplibregl-popup-close-button:hover {
          color: #e2e8f0;
          background: transparent;
        }
      `}</style>
    </div>
  )
}
