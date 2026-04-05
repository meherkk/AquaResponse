import { Flame, Map, ClipboardList, History } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { SCENARIOS, type ScenarioKey } from '../../constants/scenarios'

interface CommandBarProps {
  scenario: ScenarioKey
  onScenarioChange: (s: ScenarioKey) => void
}

const NAV_ITEMS = [
  { path: '/', label: 'MAP', icon: Map },
  { path: '/planning', label: 'PLAN', icon: ClipboardList },
  { path: '/history', label: 'HISTORY', icon: History },
] as const

export default function CommandBar({ scenario, onScenarioChange }: CommandBarProps) {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <header className="flex items-center justify-between h-14 px-4 bg-command-surface border-b border-command-border shrink-0 z-50">
      {/* Left: branding */}
      <div className="flex items-center gap-2 min-w-[220px]">
        <Flame className="w-5 h-5 text-orange-500" />
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-bold tracking-wide text-white">AQUARESPONSE</span>
          <span className="text-[10px] font-medium tracking-[0.15em] text-command-muted uppercase">
            Fire Command System
          </span>
        </div>
      </div>

      {/* Center: scenario toggles */}
      <div className="flex items-center gap-1">
        {SCENARIOS.map((s) => {
          const active = scenario === s.key
          return (
            <button
              key={s.key}
              onClick={() => onScenarioChange(s.key)}
              className={`px-3 py-1.5 text-xs font-mono tracking-wide border transition-colors ${
                active
                  ? 'border-orange-500/60 bg-orange-500/10 text-orange-400'
                  : 'border-command-border bg-transparent text-command-muted hover:text-white hover:border-command-muted'
              }`}
            >
              <span className="font-semibold">{s.short}</span>
              <span className="hidden lg:inline ml-1.5 text-[10px] opacity-70">{s.label}</span>
            </button>
          )
        })}
      </div>

      {/* Right: nav */}
      <div className="flex items-center gap-1 min-w-[220px] justify-end">
        {NAV_ITEMS.map((item) => {
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
              <item.icon className="w-3.5 h-3.5" />
              {item.label}
            </button>
          )
        })}
      </div>
    </header>
  )
}
