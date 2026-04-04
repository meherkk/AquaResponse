import { useState } from 'react'
import type { ScenarioKey } from '../constants/scenarios'

export function useScenario() {
  return useState<ScenarioKey>('risk_normal')
}
