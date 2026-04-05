import { RISK_COLORS } from '../../constants/colors'

interface RiskGaugeProps {
  score: number
  size?: number
}

export default function RiskGauge({ score, size = 160 }: RiskGaugeProps) {
  const cx = size / 2
  const cy = size / 2 + 10
  const r = size / 2 - 16
  const strokeWidth = 12

  // Build 6 arc segments across 180 degrees (each 30 degrees)
  const segments = RISK_COLORS.map((color, i) => {
    const startAngle = Math.PI + (i / 6) * Math.PI
    const endAngle = Math.PI + ((i + 1) / 6) * Math.PI
    const x1 = cx + r * Math.cos(startAngle)
    const y1 = cy + r * Math.sin(startAngle)
    const x2 = cx + r * Math.cos(endAngle)
    const y2 = cy + r * Math.sin(endAngle)
    return (
      <path
        key={i}
        d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`}
        fill="none"
        stroke={`rgb(${color[0]}, ${color[1]}, ${color[2]})`}
        strokeWidth={strokeWidth}
        strokeLinecap="butt"
      />
    )
  })

  // Needle rotation: 0 = -90deg (left), 1 = 90deg (right)
  const needleAngle = -90 + score * 180
  const needleLen = r - 8

  return (
    <svg width={size} height={size / 2 + 30} viewBox={`0 0 ${size} ${size / 2 + 30}`}>
      {segments}
      {/* Needle */}
      <g
        style={{
          transform: `rotate(${needleAngle}deg)`,
          transformOrigin: `${cx}px ${cy}px`,
          transition: 'transform 0.4s ease',
        }}
      >
        <line
          x1={cx}
          y1={cy}
          x2={cx}
          y2={cy - needleLen}
          stroke="white"
          strokeWidth={2}
          strokeLinecap="round"
        />
      </g>
      {/* Center dot */}
      <circle cx={cx} cy={cy} r={4} fill="white" />
      {/* Score text */}
      <text
        x={cx}
        y={cy + 20}
        textAnchor="middle"
        className="font-mono"
        fill="white"
        fontSize={14}
        fontWeight={600}
      >
        {(score * 100).toFixed(0)}%
      </text>
    </svg>
  )
}
