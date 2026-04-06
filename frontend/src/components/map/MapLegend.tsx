import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

const RISK_ITEMS = [
  { color: 'bg-risk-0', label: 'Negligible', range: '0–16%' },
  { color: 'bg-risk-1', label: 'Low', range: '17–33%' },
  { color: 'bg-risk-2', label: 'Moderate', range: '34–50%' },
  { color: 'bg-risk-3', label: 'High', range: '51–66%' },
  { color: 'bg-risk-4', label: 'Very High', range: '67–83%' },
  { color: 'bg-risk-5', label: 'Extreme', range: '84–100%' },
] as const

const WATER_ITEMS = [
  { size: 'w-2 h-2', color: 'bg-water-hydrant', ring: '', label: 'Hydrant' },
  { size: 'w-3 h-3', color: 'bg-water-lake', ring: '', label: 'Lake / Reservoir' },
  { size: 'w-3 h-3', color: 'bg-water-lake', ring: 'ring-2 ring-white ring-offset-1 ring-offset-command-surface', label: 'Selected source' },
] as const

export default function MapLegend() {
  const [expanded, setExpanded] = useState(true)

  if (!expanded) {
    return (
      <div
        role="region"
        aria-label="Map legend"
        className="absolute bottom-4 left-4 z-20 bg-command-surface/95 border border-command-border backdrop-blur-sm shadow-lg shadow-black/40 px-3 py-1.5 cursor-pointer hover:border-slate-600 transition-colors"
        onClick={() => setExpanded(true)}
      >
        <button
          aria-label="Expand legend"
          className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500"
        >
          LEGEND
        </button>
      </div>
    )
  }

  return (
    <div
      role="region"
      aria-label="Map legend"
      className="absolute bottom-4 left-4 z-20 w-56 bg-command-surface/95 border border-command-border backdrop-blur-sm shadow-lg shadow-black/40 p-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500">
          LEGEND
        </span>
        <button
          aria-label="Collapse legend"
          className="p-1 rounded hover:bg-white/5"
          onClick={() => setExpanded(false)}
        >
          <ChevronDown className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300 rotate-180 transition-transform duration-200" />
        </button>
      </div>

      <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mt-3 mb-1.5">
        RISK LEVEL
      </div>
      <div className="space-y-1">
        {RISK_ITEMS.map((item) => (
          <div key={item.label} className="flex items-center">
            <span className={`w-3 h-3 rounded-[2px] ${item.color}`} />
            <span className="text-[11px] font-mono text-slate-300 ml-2">{item.label}</span>
            <span className="text-[11px] font-mono text-slate-500 ml-auto">{item.range}</span>
          </div>
        ))}
      </div>

      <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-slate-500 mt-3 mb-1.5">
        WATER SOURCES
      </div>
      <div className="space-y-1">
        {WATER_ITEMS.map((item) => (
          <div key={item.label} className="flex items-center">
            <span className={`rounded-full ${item.size} ${item.color} ${item.ring}`} />
            <span className="text-[11px] font-mono text-slate-300 ml-2">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
