import RiskGauge from '../risk/RiskGauge'
import { riskColor } from '../../constants/colors'
import type { ScenarioKey } from '../../constants/scenarios'

const HAZ_CLASSES = ['Non-VHFHSZ', 'Moderate', 'High', 'Very High']

interface CellDetailPanelProps {
  cell: GeoJSON.Feature
  scenario: ScenarioKey
}

export default function CellDetailPanel({ cell, scenario }: CellDetailPanelProps) {
  const p = cell.properties as Record<string, number>
  const score = p[scenario] ?? 0
  const rgb = riskColor(score)
  const hazClass = HAZ_CLASSES[p.haz_class_encoded] ?? 'Unknown'

  const stats = [
    { label: 'HAZ CLASS', value: hazClass },
    { label: 'HYDRANT DIST', value: `${p.dist_to_nearest_hydrant_km?.toFixed(2)} km` },
    { label: 'HYDRANT DENSITY', value: `${p.hydrant_density_5km}` },
    { label: 'LAKE DIST', value: `${p.dist_to_nearest_lake_km?.toFixed(2)} km` },
    { label: 'FIRE HISTORY', value: `${p.historical_fire_count} events` },
  ]

  return (
    <div className="space-y-4">
      {/* Risk score header */}
      <div className="flex items-center gap-3">
        <div
          className="w-3 h-3 rounded-sm"
          style={{ backgroundColor: `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})` }}
        />
        <div>
          <div className="text-xs text-command-muted uppercase tracking-wider">Risk Score</div>
          <div className="text-2xl font-mono font-bold text-white">
            {(score * 100).toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Gauge */}
      <div className="flex justify-center">
        <RiskGauge score={score} size={200} />
      </div>

      {/* H3 index */}
      <div className="text-[10px] font-mono text-command-muted tracking-wide text-center">
        {p.h3_index}
      </div>

      {/* Stats grid */}
      <div className="space-y-2">
        {stats.map((s) => (
          <div key={s.label} className="flex items-center justify-between py-1.5 border-b border-command-border">
            <span className="text-[10px] text-command-muted uppercase tracking-wider">{s.label}</span>
            <span className="text-xs font-mono text-white">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Coordinates */}
      <div className="text-center pt-2">
        <span className="text-[10px] font-mono text-command-muted">
          {p.centroid_lat?.toFixed(4)}, {p.centroid_lon?.toFixed(4)}
        </span>
      </div>
    </div>
  )
}
