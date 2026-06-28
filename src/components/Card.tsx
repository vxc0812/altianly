import React, { ReactNode } from 'react'
import { View, StyleSheet, ViewStyle } from 'react-native'
import { useTheme } from '../context/ThemeContext'
import { Theme } from '../constants/theme'

type CardVariant = 'default' | 'selected' | 'flat'

interface CardProps {
  children: ReactNode
  variant?: CardVariant
  style?: ViewStyle
  accessibilityRole?: 'text' | 'header' | 'none'
  accessibilityLabel?: string
}

export function Card({
  children,
  variant = 'default',
  style,
  accessibilityRole,
  accessibilityLabel,
}: CardProps) {
  const { theme } = useTheme()
  const s = styles(theme, variant)

  return (
    <View
      style={[s.base, style]}
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
    >
      {children}
    </View>
  )
}

const styles = (t: Theme, variant: CardVariant) => {
  const variantStyles: Record<CardVariant, ViewStyle> = {
    default: {
      backgroundColor: t.surface,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 10,
      padding: 16,
    },
    selected: {
      backgroundColor: t.isDark ? '#1C2533' : '#F3EDFF',
      borderWidth: 1,
      borderColor: t.accent,
      borderRadius: 10,
      padding: 16,
    },
    flat: {
      backgroundColor: t.surface,
      borderRadius: 10,
      padding: 16,
    },
  }

  return StyleSheet.create({
    base: variantStyles[variant],
  })
}
