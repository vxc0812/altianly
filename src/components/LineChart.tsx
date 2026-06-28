import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import Svg, { Polyline, Circle, Line, Text as SvgText, G } from 'react-native-svg'
import { Theme } from '../constants/theme'

export interface DataPoint {
  label: string
  value: number
  timestamp: number
}

interface Props {
  data: DataPoint[]
  theme: Theme
  height?: number
  lineColor?: string
}

const PADDING_LEFT = 44
const PADDING_RIGHT = 16
const PADDING_TOP = 16
const PADDING_BOTTOM = 40
const DOT_RADIUS = 4

export function LineChart({ data, theme, height = 220, lineColor }: Props) {
  if (data.length < 2) {
    return (
      <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border, height }]}>
        <Text style={[styles.needsMore, { color: theme.textMuted }]}>
          {data.length === 1 ? 'One data point — need at least 2 for a graph' : 'No data yet'}
        </Text>
      </View>
    )
  }

  const color = lineColor || theme.accent
  const values = data.map((d) => d.value)
  const minVal = Math.min(...values)
  const maxVal = Math.max(...values)
  const valRange = maxVal - minVal || 1
  const padding = valRange * 0.1
  const yMin = Math.max(0, minVal - padding)
  const yMax = maxVal + padding

  const chartW = 340 - PADDING_LEFT - PADDING_RIGHT
  const chartH = height - PADDING_TOP - PADDING_BOTTOM

  function xPos(i: number): number {
    return PADDING_LEFT + (i / (data.length - 1)) * chartW
  }

  function yPos(val: number): number {
    return PADDING_TOP + ((yMax - val) / (yMax - yMin)) * chartH
  }

  const pointsStr = data.map((d, i) => `${xPos(i)},${yPos(d.value)}`).join(' ')

  const yTicks = 4
  const yTickValues: number[] = []
  for (let i = 0; i <= yTicks; i++) {
    yTickValues.push(yMin + (i / yTicks) * (yMax - yMin))
  }

  const xLabelInterval = Math.max(1, Math.floor(data.length / 6))

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Svg width="100%" height={height} viewBox={`0 0 340 ${height}`}>
        <G>
          {yTickValues.map((v, i) => {
            const y = yPos(v)
            return (
              <G key={`ytick-${i}`}>
                <Line
                  x1={PADDING_LEFT} y1={y} x2={340 - PADDING_RIGHT} y2={y}
                  stroke={theme.border} strokeWidth={1}
                />
                <SvgText
                  x={PADDING_LEFT - 6} y={y + 4}
                  fill={theme.textMuted} fontSize={11}
                  textAnchor="end"
                >
                  {v % 1 === 0 ? v.toString() : v.toFixed(1)}
                </SvgText>
              </G>
            )
          })}
        </G>

        <Polyline
          points={pointsStr}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {data.map((d, i) => {
          const cx = xPos(i)
          const cy = yPos(d.value)
          return (
            <G key={`dot-${i}`}>
              <Circle cx={cx} cy={cy} r={DOT_RADIUS + 3} fill="transparent" stroke="transparent" strokeWidth={8} />
              <Circle cx={cx} cy={cy} r={DOT_RADIUS} fill={color} />
            </G>
          )
        })}

        {data.map((d, i) => {
          if (i % xLabelInterval !== 0 && i !== data.length - 1) return null
          return (
            <SvgText
              key={`xlabel-${i}`}
              x={xPos(i)} y={height - 8}
              fill={theme.textMuted} fontSize={10}
              textAnchor="middle"
            >
              {d.label}
            </SvgText>
          )
        })}
      </Svg>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 10,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  needsMore: {
    textAlign: 'center',
    fontSize: 13,
  },
})
