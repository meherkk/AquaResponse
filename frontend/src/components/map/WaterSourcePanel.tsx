import { Droplets, Waves } from 'lucide-react'
import type { WaterSource, RouteResult } from '../../types/geo'
import type { IgnitionPoint } from '../../hooks/useIgnitionPoint'

interface WaterSourcePanelProps {
  ignitionPoint: IgnitionPoint
  waterSources: WaterSource[]
  routes: RouteResult[]
  loading?: boolean
}

export default function WaterSourcePanel({
  ignitionPoint,
  waterSources,
  routes,
  loading,
}: WaterSourcePanelProps) {
  const nearest = waterSources.slice(0, 3)

  return (
    <div className="space-y-4">
      {/* Ignition point header */}
      <div>
        <div className="text-[10px] text-command-muted uppercase tracking-wider mb-1">
          Ignition Point
        </div>
        <div className="font-mono text-sm text-white">
          {ignitionPoint.lat.toFixed(5)}, {ignitionPoint.lon.toFixed(5)}
        </div>
      </div>

      <div className="border-t border-command-border" />

      {/* Water sources */}
      <div>
        <div className="text-[10px] text-command-muted uppercase tracking-wider mb-3">
          Nearest Water Sources
        </div>

        {loading ? (
          <div className="text-xs text-command-muted animate-pulse py-4 text-center font-mono">
            Routing...
          </div>
        ) : nearest.length === 0 ? (
          <div className="text-xs text-command-muted py-4 text-center">
            No water sources found nearby
          </div>
        ) : (
          <div className="space-y-2">
            {nearest.map((src) => {
              const route = routes.find((r) => r.source.id === src.id)
              const isHydrant = src.type === 'hydrant'
              return (
                <div
                  key={src.id}
                  className="flex items-center gap-3 p-2.5 border border-command-border bg-command-bg"
                >
                  <div className={`p-1.5 ${isHydrant ? 'text-water-hydrant' : 'text-water-lake'}`}>
                    {isHydrant ? <Droplets className="w-4 h-4" /> : <Waves className="w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-white truncate">{src.name}</div>
                    {route && (
                      <div className="text-[10px] font-mono text-command-muted">
                        {(route.distance_meters / 1000).toFixed(2)} km
                      </div>
                    )}
                  </div>
                  <span
                    className={`text-[9px] font-mono px-1.5 py-0.5 uppercase tracking-wider border ${
                      isHydrant
                        ? 'text-water-hydrant border-water-hydrant/30'
                        : 'text-water-lake border-water-lake/30'
                    }`}
                  >
                    {src.type}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
