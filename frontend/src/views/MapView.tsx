import { useState, useCallback } from 'react'
import AquaMap from '../components/map/AquaMap'
import CommandBar from '../components/layout/CommandBar'
import SlidePanel from '../components/layout/SlidePanel'
import CellDetailPanel from '../components/map/CellDetailPanel'
import WaterSourcePanel from '../components/map/WaterSourcePanel'
import { useScenario } from '../hooks/useScenario'
import { useIgnitionPoint } from '../hooks/useIgnitionPoint'
import { MOCK_RISK_CELLS } from '../mocks/risk_cells_mock'
import type { WaterSource, RouteResult } from '../types/geo'

type PanelMode = 'cell' | 'water' | null

export default function MapView() {
  const [scenario, setScenario] = useScenario()
  const [ignitionPoint, setIgnitionPoint] = useIgnitionPoint()
  const [panelMode, setPanelMode] = useState<PanelMode>(null)
  const [selectedCell, setSelectedCell] = useState<GeoJSON.Feature | null>(null)

  // Placeholder until API wiring (PR 7)
  const waterSources: WaterSource[] = []
  const routes: RouteResult[] = []

  const handleCellClick = useCallback((cell: GeoJSON.Feature | null) => {
    if (cell) {
      setSelectedCell(cell)
      setPanelMode('cell')
    }
  }, [])

  const handleMapClick = useCallback((lngLat: { lng: number; lat: number }) => {
    setIgnitionPoint({ lat: lngLat.lat, lon: lngLat.lng })
    setPanelMode('water')
  }, [setIgnitionPoint])

  const handleClosePanel = useCallback(() => {
    setPanelMode(null)
    setSelectedCell(null)
  }, [])

  return (
    <div className="flex flex-col h-screen bg-command-bg">
      <CommandBar scenario={scenario} onScenarioChange={setScenario} />
      <div className="relative flex-1">
        <AquaMap
          cells={MOCK_RISK_CELLS}
          scenario={scenario}
          waterSources={waterSources}
          ignitionPoint={ignitionPoint}
          routes={routes}
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
              waterSources={waterSources}
              routes={routes}
            />
          )}
        </SlidePanel>
      </div>
    </div>
  )
}
