import { useState, useEffect } from 'react'
import { API_BASE } from '../constants/api'
import type { WaterSource } from '../types/geo'

interface UseWaterSourcesResult {
  waterSources: WaterSource[]
  loading: boolean
  error: string | null
}

export function useWaterSources(): UseWaterSourcesResult {
  const [waterSources, setWaterSources] = useState<WaterSource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    fetch(`${API_BASE}/water-sources`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Water sources request failed (${res.status})`)
        return res.json() as Promise<WaterSource[]>
      })
      .then((data) => {
        setWaterSources(data)
        setLoading(false)
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return
        const message = err instanceof Error ? err.message : 'Unknown error loading water sources'
        setError(message)
        setLoading(false)
      })

    return () => controller.abort()
  }, [])

  return { waterSources, loading, error }
}
