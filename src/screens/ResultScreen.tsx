import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RouteProp } from '@react-navigation/native'
import { RootStackParamList } from '../types'
import { calculateBMI } from '../services/bmi'
import { useTheme } from '../context/ThemeContext'
import { Theme } from '../constants/theme'

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Result'>
  route: RouteProp<RootStackParamList, 'Result'>
}

const evaluationColors: Record<string, string> = {
  underweight: '#58A6FF',
  normal: '#3FB950',
  overweight: '#D29922',
  obese: '#F85149',
}

const evaluationLabels: Record<string, string> = {
  underweight: 'Underweight',
  normal: 'Normal Weight',
  overweight: 'Overweight',
  obese: 'Obese',
}

export default function ResultScreen({ navigation, route }: Props) {
  const { theme } = useTheme()
  const s = styles(theme)
  const { userInput } = route.params
  const { bmi, evaluation } = calculateBMI(userInput.weightLbs, userInput.heightFeet, userInput.heightInches)
  const color = evaluationColors[evaluation]

  return (
    <View style={s.container}>
      <View style={s.card}>
        <Text style={[s.bmiValue, { color }]}>{bmi}</Text>
        <Text style={s.bmiLabel}>Your BMI</Text>
        <View style={[s.badge, { backgroundColor: color + '22' }]}>
          <Text style={[s.badgeText, { color }]}>{evaluationLabels[evaluation]}</Text>
        </View>
      </View>

      <Text style={s.info}>
        {evaluation === 'underweight'
          ? 'You may need to gain some weight. A tailored workout plan can help build strength safely.'
          : evaluation === 'normal'
          ? 'You are at a healthy weight. A workout plan can help maintain and improve your fitness.'
          : 'A structured workout plan can help you reach a healthier weight range.'}
      </Text>

      <TouchableOpacity
        style={s.primaryButton}
        onPress={() => navigation.navigate('Questionnaire', { userInput, bmiResult: { bmi, evaluation } })}
      >
        <Text style={s.primaryButtonText}>Create Workout Plan</Text>
      </TouchableOpacity>

      <TouchableOpacity style={s.secondaryButton} onPress={() => navigation.goBack()}>
        <Text style={s.secondaryButtonText}>Re-enter Measurements</Text>
      </TouchableOpacity>
    </View>
  )
}

const styles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg, padding: 24, justifyContent: 'center' },
  card: { alignItems: 'center', marginBottom: 32 },
  bmiValue: { fontSize: 64, fontWeight: '800', color: t.accent },
  bmiLabel: { fontSize: 16, color: t.textSecondary, marginTop: 4 },
  badge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginTop: 12 },
  badgeText: { fontSize: 16, fontWeight: '700' },
  info: { color: t.text, fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 32 },
  primaryButton: { backgroundColor: t.success, padding: 16, borderRadius: 8, alignItems: 'center', marginBottom: 12 },
  primaryButtonText: { color: t.successText, fontSize: 16, fontWeight: '700' },
  secondaryButton: { padding: 16, alignItems: 'center' },
  secondaryButtonText: { color: t.accent, fontSize: 15 },
})
