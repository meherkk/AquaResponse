import { useState, useEffect } from 'react'
import { API_BASE } from '../constants/api'

interface UseRiskCellsResult {
  cells: GeoJSON.FeatureCollection | null
  loading: boolean
  error: string | null
}

export function useRiskCells(): UseRiskCellsResult {
  const [cells, setCells] = useState<GeoJSON.FeatureCollection | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    fetch(`${API_BASE}/risk-cells`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Risk cells request failed (${res.status})`)
        return res.json() as Promise<GeoJSON.FeatureCollection>
      })
      .then((data) => {
        setCells(data)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        const message = err instanceof Error ? err.message : 'Unknown error loading risk cells'
        setError(message)
        setLoading(false)
      })

    return () => controller.abort()
  }, [])

  return { cells, loading, error }
}
