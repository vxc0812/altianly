import React from 'react'
import Svg, { Path, Circle, Line } from 'react-native-svg'

export type AppIconName = 'home' | 'barbell' | 'nutrition' | 'person' | 'settings' | 'moon' | 'sun'

type Props = {
  name: AppIconName
  size?: number
  color: string
  /** Thicker stroke for active tab states */
  focused?: boolean
}

// Inline SVG icons (Feather-style strokes) — no icon font required,
// which avoids the font-loading failure on static web exports.
export default function AppIcon({ name, size = 22, color, focused = false }: Props) {
  const sw = focused ? 2.5 : 2
  const p = {
    stroke: color,
    strokeWidth: sw,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none' as const,
  }

  switch (name) {
    case 'home':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" {...p} />
          <Path d="M9 22V12h6v10" {...p} />
        </Svg>
      )
    case 'barbell':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M6.5 6.5v11" {...p} />
          <Path d="M17.5 6.5v11" {...p} />
          <Path d="M3 9v6" {...p} />
          <Path d="M21 9v6" {...p} />
          <Path d="M6.5 12h11" {...p} />
        </Svg>
      )
    case 'nutrition':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M5 2v5a3 3 0 0 0 6 0V2" {...p} />
          <Path d="M8 10v12" {...p} />
          <Path d="M17 2v20" {...p} />
          <Path d="M17 2c3.5 3 3.5 8.5 0 11.5" {...p} />
        </Svg>
      )
    case 'person':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" {...p} />
          <Circle cx={12} cy={7} r={4} {...p} />
        </Svg>
      )
    case 'settings':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={3} {...p} />
          <Path
            d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
            {...p}
          />
        </Svg>
      )
    case 'moon':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" {...p} />
        </Svg>
      )
    case 'sun':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24">
          <Circle cx={12} cy={12} r={5} {...p} />
          <Line x1={12} y1={1} x2={12} y2={3} {...p} />
          <Line x1={12} y1={21} x2={12} y2={23} {...p} />
          <Line x1={4.22} y1={4.22} x2={5.64} y2={5.64} {...p} />
          <Line x1={18.36} y1={18.36} x2={19.78} y2={19.78} {...p} />
          <Line x1={1} y1={12} x2={3} y2={12} {...p} />
          <Line x1={21} y1={12} x2={23} y2={12} {...p} />
          <Line x1={4.22} y1={19.78} x2={5.64} y2={18.36} {...p} />
          <Line x1={18.36} y1={5.64} x2={19.78} y2={4.22} {...p} />
        </Svg>
      )
  }
}
