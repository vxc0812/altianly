import React from 'react'
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native'
import { useTheme } from '../context/ThemeContext'
import { Theme } from '../constants/theme'

interface InputProps extends TextInputProps {
  label?: string
  error?: string
  hint?: string
  containerStyle?: ViewStyle
}

export function Input({
  label,
  error,
  hint,
  containerStyle,
  style,
  ...rest
}: InputProps) {
  const { theme } = useTheme()
  const s = styles(theme)

  return (
    <View style={[s.container, containerStyle]}>
      {label && <Text style={s.label}>{label}</Text>}
      <TextInput
        style={[s.input, error && s.inputError, style]}
        placeholderTextColor={theme.textMuted}
        autoCapitalize="none"
        {...rest}
      />
      {hint && !error && <Text style={s.hint}>{hint}</Text>}
      {error && <Text style={s.error}>{error}</Text>}
    </View>
  )
}

const styles = (t: Theme) =>
  StyleSheet.create({
    container: { marginBottom: 20 },
    label: { color: t.text, fontSize: 14, fontWeight: '600', marginBottom: 6 },
    input: {
      backgroundColor: t.inputBg,
      borderWidth: 1,
      borderColor: t.border,
      borderRadius: 8,
      padding: 14,
      color: t.text,
      fontSize: 16,
    },
    inputError: { borderColor: t.danger },
    hint: { color: t.textMuted, fontSize: 12, marginTop: 4 },
    error: { color: t.danger, fontSize: 12, marginTop: 4 },
  })
