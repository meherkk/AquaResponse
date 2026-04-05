import { useState, useCallback } from 'react'
import AquaMap from '../components/map/AquaMap'
import MapLegend from '../components/map/MapLegend'
import CommandBar from '../components/layout/CommandBar'
import SlidePanel from '../components/layout/SlidePanel'
import CellDetailPanel from '../components/map/CellDetailPanel'
import WaterSourcePanel from '../components/map/WaterSourcePanel'
import { useScenario } from '../hooks/useScenario'
import { useIgnitionPoint } from '../hooks/useIgnitionPoint'
import { useRiskCells } from '../hooks/useRiskCells'
import { useWaterSources } from '../hooks/useWaterSources'
import { fetchRoute } from '../hooks/useRoute'
import type { RouteResult } from '../types/geo'

type PanelMode = 'cell' | 'water' | null

export default function MapView() {
  const [scenario, setScenario] = useScenario()
  const [ignitionPoint, setIgnitionPoint] = useIgnitionPoint()
  const [panelMode, setPanelMode] = useState<PanelMode>(null)
  const [selectedCell, setSelectedCell] = useState<GeoJSON.Feature | null>(null)
  const [routes, setRoutes] = useState<RouteResult[]>([])

  const { cells, loading: cellsLoading, error: cellsError } = useRiskCells()
  const { waterSources, loading: wsLoading, error: wsError } = useWaterSources()

  const loading = cellsLoading || wsLoading
  const error = cellsError || wsError

  const handleCellClick = useCallback((cell: GeoJSON.Feature | null) => {
    if (cell) {
      setSelectedCell(cell)
      setPanelMode('cell')
    }
  }, [])

  const handleMapClick = useCallback((lngLat: { lng: number; lat: number }) => {
    setIgnitionPoint({ lat: lngLat.lat, lon: lngLat.lng })
    setPanelMode('water')
    setRoutes([])
    fetchRoute(lngLat.lat, lngLat.lng)
      .then(setRoutes)
      .catch(() => setRoutes([]))
  }, [setIgnitionPoint])

  const handleClosePanel = useCallback(() => {
    setPanelMode(null)
    setSelectedCell(null)
  }, [])

  return (
    <div className="flex flex-col h-screen bg-command-bg">
      {error && (
        <div className="bg-red-900/80 text-red-200 text-xs px-4 py-2 text-center">
          {error} — check backend connection
        </div>
      )}
      <CommandBar scenario={scenario} onScenarioChange={setScenario} />
      <div className="relative flex-1">
        {loading && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 bg-command-surface/90 border border-slate-700 px-3 py-1 text-xs text-slate-400 tracking-widest uppercase pointer-events-none">
            Loading risk data...
          </div>
        )}
        <MapLegend />
        <AquaMap
          cells={cells}
          scenario={scenario}
          waterSources={waterSources}
          ignitionPoint={ignitionPoint}
          routes={routes}
          highlightedIds={routes.map(r => r.source.id)}
          onCellClick={handleCellClick}
          onMapClick={handleMapClick}
        />
        <SlidePanel open={panelMode !== null} onClose={handleClosePanel}>
          {panelMode === 'cell' && selectedCell && (
            <CellDetailPanel cell={selectedCell} scenario={scenario} />
          )}
          {panelMode === 'water' && ignitionPoint && (
            <WaterSourcePanel
              ignitionPoint={ignitionPoint}
              routes={routes}
            />
          )}
        </SlidePanel>
      </div>
    </div>
  )
}
