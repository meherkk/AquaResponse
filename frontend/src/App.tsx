import { BrowserRouter, Routes, Route } from 'react-router-dom'
import MapView from './views/MapView'
import PlanningView from './views/PlanningView'
import HistoryView from './views/HistoryView'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MapView />} />
        <Route path="/planning" element={<PlanningView />} />
        <Route path="/history" element={<HistoryView />} />
      </Routes>
    </BrowserRouter>
  )
}
