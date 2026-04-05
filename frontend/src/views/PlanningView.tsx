import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  ScatterChart, Scatter, CartesianGrid,
  ResponsiveContainer, ReferenceLine, Label,
} from 'recharts'
import CommandBar from '../components/layout/CommandBar'
import { useScenario } from '../hooks/useScenario'
import { useRiskCells } from '../hooks/useRiskCells'
import { riskColor } from '../constants/colors'
import type { ScenarioKey } from '../constants/scenarios'
import type { H3Cell } from '../types/geo'

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function rgb(c: [number, number, number]): string {
  return `rgb(${c[0]},${c[1]},${c[2]})`
}

function extractCells(fc: GeoJSON.FeatureCollection): H3Cell[] {
  return fc.features.map((f) => f.properties as H3Cell)
}

const HAZ_LABELS: Record<number, string> = {
  0: 'LOW',
  1: 'MOD',
  2: 'HIGH',
  3: 'V.HIGH',
}

function hazLabel(v: number): string {
  return HAZ_LABELS[v] ?? 'UNK'
}

/* ------------------------------------------------------------------ */
/*  Tooltip                                                           */
/* ------------------------------------------------------------------ */

interface TipPayloadEntry {
  payload?: Record<string, unknown>
}

interface TipProps {
  active?: boolean
  payload?: TipPayloadEntry[]
}

function DarkTooltip({ active, payload }: TipProps) {
  if (!active || !payload?.[0]?.payload) return null
  const d = payload[0].payload
  return (
    <div className="bg-command-surface border border-slate-700 px-3 py-2 font-mono text-xs text-slate-300">
      {d.h3_index != null && <div>CELL {String(d.h3_index).slice(-6)}</div>}
      {d.risk != null && <div>RISK {(Number(d.risk) * 100).toFixed(1)}%</div>}
      {d.count != null && <div>COUNT {String(d.count)}</div>}
      {d.hydrant_density_5km != null && <div>DENSITY {String(d.hydrant_density_5km)}</div>}
      {d.dist != null && <div>DIST {Number(d.dist).toFixed(2)} km</div>}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Panel wrapper                                                     */
/* ------------------------------------------------------------------ */

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col bg-command-surface border border-slate-800 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800">
        <span className="text-[11px] font-mono font-semibold tracking-[0.2em] text-slate-400 uppercase">
          {title}
        </span>
      </div>
      <div className="flex-1 min-h-0 p-4">{children}</div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Panel 1 — Risk Distribution Histogram                             */
/* ------------------------------------------------------------------ */

interface HistogramProps {
  cells: H3Cell[]
  scenario: ScenarioKey
}

const BUCKET_LABELS = [
  '0-10', '10-20', '20-30', '30-40', '40-50',
  '50-60', '60-70', '70-80', '80-90', '90-100',
]

function RiskHistogram({ cells, scenario }: HistogramProps) {
  const data = useMemo(() => {
    const counts = new Array(10).fill(0) as number[]
    for (const c of cells) {
      const score = c[scenario]
      const idx = Math.min(9, Math.floor(score * 10))
      counts[idx]++
    }
    return counts.map((count, i) => ({
      bucket: BUCKET_LABELS[i],
      count,
      midpoint: (i + 0.5) / 10,
    }))
  }, [cells, scenario])

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 8, right: 12, bottom: 24, left: 12 }}>
        <XAxis
          dataKey="bucket"
          tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}
          axisLine={{ stroke: '#334155' }}
          tickLine={false}
          label={{ value: 'Risk %', position: 'insideBottom', offset: -16, fontSize: 10, fill: '#64748b' }}
        />
        <YAxis
          tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}
          axisLine={{ stroke: '#334155' }}
          tickLine={false}
          label={{ value: 'Cells', angle: -90, position: 'insideLeft', offset: 4, fontSize: 10, fill: '#64748b' }}
        />
        <Tooltip content={<DarkTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
        <Bar dataKey="count" radius={[2, 2, 0, 0]}>
          {data.map((entry) => (
            <Cell key={entry.bucket} fill={rgb(riskColor(entry.midpoint))} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

/* ------------------------------------------------------------------ */
/*  Panel 2 — Infrastructure Gap Scatter                              */
/* ------------------------------------------------------------------ */

interface ScatterProps {
  cells: H3Cell[]
}

function InfraScatter({ cells }: ScatterProps) {
  const data = useMemo(() => {
    // every 5th cell for performance
    const sampled: {
      h3_index: string
      hydrant_density_5km: number
      dist: number
      risk: number
      fill: string
    }[] = []
    for (let i = 0; i < cells.length; i += 5) {
      const c = cells[i]
      sampled.push({
        h3_index: c.h3_index,
        hydrant_density_5km: c.hydrant_density_5km,
        dist: c.dist_to_nearest_hydrant_km,
        risk: c.risk_extreme_santa_ana,
        fill: rgb(riskColor(c.risk_extreme_santa_ana)),
      })
    }
    return sampled
  }, [cells])

  const maxDensity = useMemo(
    () => Math.max(...data.map((d) => d.hydrant_density_5km), 1),
    [data],
  )
  const maxDist = useMemo(
    () => Math.max(...data.map((d) => d.dist), 1),
    [data],
  )

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ScatterChart margin={{ top: 8, right: 16, bottom: 24, left: 12 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis
          type="number"
          dataKey="hydrant_density_5km"
          name="Hydrant Density"
          domain={[0, maxDensity]}
          tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}
          axisLine={{ stroke: '#334155' }}
          tickLine={false}
          label={{ value: 'Hydrant Density (5 km)', position: 'insideBottom', offset: -16, fontSize: 10, fill: '#64748b' }}
        />
        <YAxis
          type="number"
          dataKey="dist"
          name="Dist to Hydrant"
          domain={[0, maxDist]}
          tick={{ fontSize: 10, fill: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}
          axisLine={{ stroke: '#334155' }}
          tickLine={false}
          label={{ value: 'Dist to Hydrant (km)', angle: -90, position: 'insideLeft', offset: 4, fontSize: 10, fill: '#64748b' }}
        />
        <Tooltip content={<DarkTooltip />} />
        {/* Coverage gap annotation: low density, far from hydrant */}
        <ReferenceLine x={maxDensity * 0.35} stroke="#334155" strokeDasharray="4 4">
          <Label value="" />
        </ReferenceLine>
        <ReferenceLine y={maxDist * 0.65} stroke="#334155" strokeDasharray="4 4">
          <Label
            value="COVERAGE GAP"
            position="insideTopRight"
            style={{ fontSize: 10, fill: '#475569', fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.1em' }}
          />
        </ReferenceLine>
        <Scatter data={data} shape="circle">
          {data.map((entry, idx) => (
            <Cell key={idx} fill={entry.fill} r={3} />
          ))}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  )
}

/* ------------------------------------------------------------------ */
/*  Panel 3 — High-Risk Corridor Table                                */
/* ------------------------------------------------------------------ */

interface TableProps {
  cells: H3Cell[]
}

function CorridorTable({ cells }: TableProps) {
  const top20 = useMemo(() => {
    return [...cells]
      .sort((a, b) => b.risk_extreme_santa_ana - a.risk_extreme_santa_ana)
      .slice(0, 20)
  }, [cells])

  return (
    <div className="h-full overflow-y-auto">
      <table className="w-full font-mono text-xs">
        <thead>
          <tr className="text-slate-500 text-[10px] tracking-wider border-b border-slate-800 sticky top-0 bg-command-surface">
            <th className="text-left py-2 px-2 font-medium">CELL</th>
            <th className="text-left py-2 px-2 font-medium">HAZ</th>
            <th className="text-right py-2 px-2 font-medium">HYDRANT km</th>
            <th className="text-right py-2 px-2 font-medium w-32">RISK</th>
          </tr>
        </thead>
        <tbody>
          {top20.map((cell) => {
            const risk = cell.risk_extreme_santa_ana
            const color = rgb(riskColor(risk))
            return (
              <tr
                key={cell.h3_index}
                className="border-b border-slate-800/50 hover:bg-white/[0.02] transition-colors"
              >
                <td className="py-1.5 px-2 text-slate-300">{cell.h3_index.slice(-6)}</td>
                <td className="py-1.5 px-2 text-slate-400">{hazLabel(cell.haz_class_encoded)}</td>
                <td className="py-1.5 px-2 text-right text-slate-400">
                  {cell.dist_to_nearest_hydrant_km.toFixed(1)}
                </td>
                <td className="py-1.5 px-2 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <div className="flex-1 h-1.5 bg-slate-800 max-w-[60px]">
                      <div
                        className="h-full"
                        style={{ width: `${risk * 100}%`, backgroundColor: color }}
                      />
                    </div>
                    <span style={{ color }} className="w-12 text-right tabular-nums">
                      {(risk * 100).toFixed(1)}%
                    </span>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main view                                                         */
/* ------------------------------------------------------------------ */

export default function PlanningView() {
  const [scenario, setScenario] = useScenario()
  const data = useRiskCells()

  const cells = useMemo(() => (data ? extractCells(data) : []), [data])

  if (!data) {
    return (
      <div className="flex flex-col h-screen bg-command-bg">
        <CommandBar scenario={scenario} onScenarioChange={setScenario} />
        <div className="flex-1 flex items-center justify-center">
          <span className="text-sm font-mono text-slate-500 tracking-widest">LOADING...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-command-bg">
      <CommandBar scenario={scenario} onScenarioChange={setScenario} />
      <div className="flex-1 min-h-0 grid grid-cols-3 gap-px p-2">
        <Panel title="RISK DISTRIBUTION">
          <RiskHistogram cells={cells} scenario={scenario} />
        </Panel>
        <Panel title="INFRASTRUCTURE GAPS">
          <InfraScatter cells={cells} />
        </Panel>
        <Panel title="HIGH-RISK CORRIDORS">
          <CorridorTable cells={cells} />
        </Panel>
      </div>
    </div>
  )
}
