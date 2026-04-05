import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Monitor } from 'lucide-react'
import MapView from './views/MapView'
import PlanningView from './views/PlanningView'
import HistoryView from './views/HistoryView'

function MobileGuard({ children }: { children: React.ReactNode }) {
  const [narrow, setNarrow] = useState(false)

  useEffect(() => {
    const check = () => setNarrow(window.innerWidth < 900)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  if (narrow) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-command-bg px-8 text-center gap-4">
        <Monitor className="w-10 h-10 text-command-muted" />
        <div className="font-mono text-sm font-bold tracking-widest text-white uppercase">
          Desktop Required
        </div>
        <div className="font-mono text-xs text-command-muted leading-relaxed max-w-xs">
          AquaResponse is optimized for desktop viewports (900px+). Please open on a larger screen.
        </div>
      </div>
    )
  }

  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <MobileGuard>
        <Routes>
          <Route path="/" element={<MapView />} />
          <Route path="/planning" element={<PlanningView />} />
          <Route path="/history" element={<HistoryView />} />
        </Routes>
      </MobileGuard>
    </BrowserRouter>
  )
}
