import { useState, useEffect } from 'react'
import type { FireIncident } from '../types/geo'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'

export function useFireIncidents(): { incidents: FireIncident[]; loading: boolean; error: string | null } {
  const [incidents, setIncidents] = useState<FireIncident[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetch(`${API_BASE}/fire-incidents`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data: FireIncident[]) => {
        if (!cancelled) {
          setIncidents(data)
          setLoading(false)
        }
      })
      .catch((e: Error) => {
        if (!cancelled) {
          setError(e.message)
          setLoading(false)
        }
      })
    return () => { cancelled = true }
  }, [])

  return { incidents, loading, error }
}
