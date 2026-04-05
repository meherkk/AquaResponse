import { H3HexagonLayer } from '@deck.gl/geo-layers'
import { riskColor } from '../../constants/colors'
import type { ScenarioKey } from '../../constants/scenarios'

export function createH3HexLayer(
  cells: GeoJSON.FeatureCollection | null,
  scenario: ScenarioKey,
  onCellClick: (object: GeoJSON.Feature | null) => void,
) {
  return new H3HexagonLayer({
    id: 'h3-hex',
    data: cells?.features ?? [],
    extruded: true,
    elevationScale: 200,
    getHexagon: (d: GeoJSON.Feature) => (d.properties as Record<string, string>).h3_index,
    getFillColor: (d: GeoJSON.Feature) => {
      const score = (d.properties as Record<string, number>)[scenario] ?? 0
      const rgb = riskColor(score)
      return [rgb[0], rgb[1], rgb[2], 200] as [number, number, number, number]
    },
    getElevation: (d: GeoJSON.Feature) => {
      const score = (d.properties as Record<string, number>)[scenario] ?? 0
      return score * 1000
    },
    pickable: true,
    autoHighlight: true,
    highlightColor: [255, 255, 255, 60],
    onClick: ({ object }: { object: GeoJSON.Feature | null }) => onCellClick(object),
    transitions: { getFillColor: 400, getElevation: 400 },
    updateTriggers: { getFillColor: [scenario], getElevation: [scenario] },
  })
}
