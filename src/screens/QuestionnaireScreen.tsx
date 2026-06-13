import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RouteProp } from '@react-navigation/native'
import { RootStackParamList, Lifestyle, ExerciseLevel, TrainingSplit } from '../types'
import { useTheme } from '../context/ThemeContext'
import { TRAINING_SPLITS } from '../constants'
import { Theme } from '../constants/theme'

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Questionnaire'>
  route: RouteProp<RootStackParamList, 'Questionnaire'>
}

const lifestyleOptions: { value: Lifestyle; label: string; desc: string }[] = [
  { value: 'sedentary', label: 'Sedentary', desc: 'Little or no daily exercise' },
  { value: 'moderate', label: 'Moderate', desc: 'Light activity 1-3 days/week' },
  { value: 'active', label: 'Active', desc: 'Active job or exercise 4+ days/week' },
]

const exerciseOptions: { value: ExerciseLevel; label: string; desc: string }[] = [
  { value: 'low', label: 'Low', desc: 'Beginner, little workout experience' },
  { value: 'medium', label: 'Medium', desc: 'Some experience, can do moderate workouts' },
  { value: 'high', label: 'High', desc: 'Experienced, ready for intense training' },
]

export default function QuestionnaireScreen({ navigation, route }: Props) {
  const { theme } = useTheme()
  const s = styles(theme)
  const { userInput, bmiResult } = route.params
  const [lifestyle, setLifestyle] = useState<Lifestyle | null>(null)
  const [exerciseLevel, setExerciseLevel] = useState<ExerciseLevel | null>(null)
  const [trainingSplit, setTrainingSplit] = useState<TrainingSplit | null>(null)

  function handleGenerate() {
    if (!lifestyle || !exerciseLevel || !trainingSplit) return
    navigation.navigate('WorkoutPlan', { userInput, bmiResult, answers: { lifestyle, exerciseLevel, trainingSplit } })
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <Text style={s.heading}>Let's Personalize Your Plan</Text>

      <Text style={s.sectionTitle}>Lifestyle</Text>
      <View style={s.optionsContainer}>
        {lifestyleOptions.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[s.optionCard, lifestyle === opt.value && s.optionCardSelected]}
            onPress={() => setLifestyle(opt.value)}
          >
            <Text style={[s.optionLabel, lifestyle === opt.value && s.optionLabelSelected]}>{opt.label}</Text>
            <Text style={s.optionDesc}>{opt.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.sectionTitle}>Exercise Level</Text>
      <View style={s.optionsContainer}>
        {exerciseOptions.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[s.optionCard, exerciseLevel === opt.value && s.optionCardSelected]}
            onPress={() => setExerciseLevel(opt.value)}
          >
            <Text style={[s.optionLabel, exerciseLevel === opt.value && s.optionLabelSelected]}>{opt.label}</Text>
            <Text style={s.optionDesc}>{opt.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.sectionTitle}>Training Split</Text>
      <View style={s.optionsContainer}>
        {TRAINING_SPLITS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[s.optionCard, trainingSplit === opt.value && s.optionCardSelected]}
            onPress={() => setTrainingSplit(opt.value)}
          >
            <Text style={[s.optionLabel, trainingSplit === opt.value && s.optionLabelSelected]}>{opt.label}</Text>
            <Text style={s.optionDesc}>{opt.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[s.button, (!lifestyle || !exerciseLevel || !trainingSplit) && s.buttonDisabled]}
        onPress={handleGenerate}
        disabled={!lifestyle || !exerciseLevel || !trainingSplit}
      >
        <Text style={s.buttonText}>Generate Workout Plan</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  heading: { fontSize: 24, fontWeight: '700', color: t.text, marginBottom: 28 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: t.textSecondary, marginBottom: 10, marginTop: 8 },
  optionsContainer: { gap: 10, marginBottom: 24 },
  optionCard: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: 10, padding: 16 },
  optionCardSelected: { borderColor: t.accent, backgroundColor: t.isDark ? '#1C2533' : '#F3EDFF' },
  optionLabel: { fontSize: 16, fontWeight: '700', color: t.text },
  optionLabelSelected: { color: t.accent },
  optionDesc: { fontSize: 13, color: t.textSecondary, marginTop: 4 },
  button: { backgroundColor: t.success, padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: t.successText, fontSize: 16, fontWeight: '700' },
})
