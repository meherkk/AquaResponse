import { useState, useEffect } from 'react'
import { MOCK_RISK_CELLS } from '../mocks/risk_cells_mock'

/**
 * Returns the full risk-cell dataset as a GeoJSON FeatureCollection.
 * Currently backed by mock data; will be wired to GET /risk-cells later.
 */
export function useRiskCells(): GeoJSON.FeatureCollection | null {
  const [data, setData] = useState<GeoJSON.FeatureCollection | null>(null)

  useEffect(() => {
    // Simulate async load so consumers handle the null/loading state
    const id = setTimeout(() => setData(MOCK_RISK_CELLS), 80)
    return () => clearTimeout(id)
  }, [])

  return data
}
