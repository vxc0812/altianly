import React, { useEffect, useState, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from 'react-native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RouteProp } from '@react-navigation/native'
import { RootStackParamList, WorkoutPlan } from '../types'
import { generateWorkoutPlan } from '../services/llm'
import { saveWorkoutPlan, getLLMConfig } from '../services/storage'
import { DEFAULT_LLM_CONFIG } from '../constants'
import { useTheme } from '../context/ThemeContext'
import { Theme } from '../constants/theme'

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'WorkoutPlan'>
  route: RouteProp<RootStackParamList, 'WorkoutPlan'>
}

export default function WorkoutPlanScreen({ navigation, route }: Props) {
  const { theme } = useTheme()
  const s = styles(theme)
  const { userInput, bmiResult, answers } = route.params
  const [plan, setPlan] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const savedRef = useRef(false)

  useEffect(() => { loadPlan() }, [])

  async function loadPlan() {
    setLoading(true)
    setError('')
    try {
      const storedConfig = await getLLMConfig()
      const config = storedConfig || DEFAULT_LLM_CONFIG
      let fullPlan = ''
      await generateWorkoutPlan(
        config,
        { age: userInput.age, gender: userInput.gender, bmi: bmiResult.bmi, evaluation: bmiResult.evaluation, lifestyle: answers.lifestyle, exerciseLevel: answers.exerciseLevel },
        (chunk) => { fullPlan += chunk; setPlan(fullPlan) }
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate plan')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (savedRef.current) return
    savedRef.current = true
    const record: WorkoutPlan = { id: Date.now().toString(), timestamp: Date.now(), userInput, bmiResult, answers, plan }
    await saveWorkoutPlan(record)
    setSaved(true)
  }

  return (
    <View style={s.container}>
      <Text style={s.heading}>Your Workout Plan</Text>

      {loading && !plan ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={s.loadingText}>Generating your personalized plan...</Text>
          <Text style={s.loadingSubtext}>Make sure Ollama is running on your device</Text>
        </View>
      ) : error && !plan ? (
        <View style={s.center}>
          <Text style={s.errorText}>{error}</Text>
          <Text style={s.errorHint}>Ensure Ollama is running at localhost:11434 and the model is pulled.</Text>
          <TouchableOpacity style={s.retryButton} onPress={loadPlan}>
            <Text style={s.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={s.planScroll} contentContainerStyle={s.planContent}>
          <Text style={s.planText}>{plan}</Text>
          {loading && (
            <View style={s.streamRow}>
              <ActivityIndicator size="small" color={theme.accent} />
              <Text style={s.streamText}>Generating...</Text>
            </View>
          )}
        </ScrollView>
      )}

      {plan && !loading && (
        <View style={s.actions}>
          <TouchableOpacity style={[s.saveButton, saved && s.savedButton]} onPress={handleSave} disabled={saved}>
            <Text style={s.saveButtonText}>{saved ? 'Saved' : 'Save Plan'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.newButton} onPress={() => navigation.popToTop()}>
            <Text style={s.newButtonText}>Start Over</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )
}

const styles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg, padding: 24, paddingTop: 60 },
  heading: { fontSize: 24, fontWeight: '700', color: t.text, marginBottom: 20 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: t.text, fontSize: 16, marginTop: 16 },
  loadingSubtext: { color: t.textSecondary, fontSize: 13, marginTop: 8, textAlign: 'center' },
  errorText: { color: t.danger, fontSize: 15, textAlign: 'center', marginBottom: 8 },
  errorHint: { color: t.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: 20 },
  retryButton: { backgroundColor: t.surface, padding: 14, borderRadius: 8, borderWidth: 1, borderColor: t.border },
  retryButtonText: { color: t.accent, fontSize: 15, fontWeight: '600' },
  planScroll: { flex: 1 },
  planContent: { paddingBottom: 20 },
  planText: { color: t.text, fontSize: 14, lineHeight: 22, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  streamRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8 },
  streamText: { color: t.textSecondary, fontSize: 13 },
  actions: { gap: 10, paddingTop: 16, borderTopWidth: 1, borderTopColor: t.border },
  saveButton: { backgroundColor: t.success, padding: 16, borderRadius: 8, alignItems: 'center' },
  savedButton: { opacity: 0.6 },
  saveButtonText: { color: t.successText, fontSize: 16, fontWeight: '700' },
  newButton: { padding: 12, alignItems: 'center' },
  newButtonText: { color: t.accent, fontSize: 15 },
})
