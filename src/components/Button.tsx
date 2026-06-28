import React from 'react'
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native'
import { useTheme } from '../context/ThemeContext'
import { Theme } from '../constants/theme'

type Variant = 'primary' | 'secondary' | 'danger' | 'ghost'

interface ButtonProps {
  title: string
  onPress: () => void
  variant?: Variant
  disabled?: boolean
  loading?: boolean
  style?: ViewStyle
  textStyle?: TextStyle
  accessibilityLabel?: string
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  style,
  textStyle,
  accessibilityLabel,
}: ButtonProps) {
  const { theme } = useTheme()
  const s = styles(theme, variant)

  return (
    <TouchableOpacity
      style={[s.base, disabled && s.disabled, style]}
      onPress={onPress}
      disabled={disabled || loading}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled: disabled || loading }}
    >
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? theme.successText : theme.accent} size="small" />
      ) : (
        <Text style={[s.text, textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  )
}

const styles = (t: Theme, variant: Variant) => {
  const variantStyles: Record<Variant, { container: ViewStyle; text: TextStyle }> = {
    primary: {
      container: { backgroundColor: t.success },
      text: { color: t.successText },
    },
    secondary: {
      container: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border },
      text: { color: t.accent },
    },
    danger: {
      container: { backgroundColor: t.danger + '22' },
      text: { color: t.danger },
    },
    ghost: {
      container: { backgroundColor: 'transparent' },
      text: { color: t.accent },
    },
  }

  const v = variantStyles[variant]

  return StyleSheet.create({
    base: {
      padding: 16,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 50,
      ...v.container,
    },
    disabled: { opacity: 0.5 },
    text: {
      fontSize: 16,
      fontWeight: '700',
      ...v.text,
    },
  })
}
