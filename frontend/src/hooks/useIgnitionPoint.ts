import { useState } from 'react'

export interface IgnitionPoint {
  lat: number
  lon: number
}

export function useIgnitionPoint() {
  return useState<IgnitionPoint | null>(null)
}
