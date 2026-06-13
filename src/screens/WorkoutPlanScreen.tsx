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
import { RootStackParamList, WorkoutPlan, StructuredWorkoutPlan } from '../types'
import { generateWorkoutPlan, extractStructuredPlan } from '../services/llm'
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
  const [structuredPlan, setStructuredPlan] = useState<StructuredWorkoutPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [progress, setProgress] = useState(0)
  const savedRef = useRef(false)
  const planId = useRef(Date.now().toString())
  const tokenCount = useRef(0)

  useEffect(() => { loadPlan() }, [])

  async function loadPlan() {
    setLoading(true)
    setError('')
    setProgress(0)
    tokenCount.current = 0
    try {
      const storedConfig = await getLLMConfig()
      const config = storedConfig || DEFAULT_LLM_CONFIG
      let fullPlan = ''
      await generateWorkoutPlan(
        config,
        {
          age: userInput.age,
          gender: userInput.gender,
          bmi: bmiResult.bmi,
          evaluation: bmiResult.evaluation,
          lifestyle: answers.lifestyle,
          exerciseLevel: answers.exerciseLevel,
          split: answers.trainingSplit,
        },
        (chunk) => {
          fullPlan += chunk
          tokenCount.current += chunk.length
          const pct = Math.min(Math.round((tokenCount.current / 2048) * 100), 95)
          setProgress(pct)
          setPlan(fullPlan)
        }
      )
      setProgress(100)
      const result = extractStructuredPlan(fullPlan)
      setPlan(result.plan)
      setStructuredPlan(result.structured || null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate plan')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (savedRef.current) return
    savedRef.current = true
    const record: WorkoutPlan = {
      id: planId.current,
      timestamp: Date.now(),
      userInput,
      bmiResult,
      answers,
      plan,
      structuredPlan: structuredPlan || undefined,
    }
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
      ) : loading ? (
        <View style={s.center}>
          <View style={s.progressContainer}>
            <View style={s.progressBar}>
              <View style={[s.progressFill, { width: `${progress}%` }]} />
            </View>
            <Text style={s.progressText}>{progress}%</Text>
          </View>
          <Text style={s.loadingSubtext}>Make sure Ollama is running on your device</Text>
        </View>
      ) : structuredPlan ? (
        <ScrollView style={s.planScroll} contentContainerStyle={s.planContent}>
          {structuredPlan.days.map((day) => (
            <View key={day.day} style={s.dayCard}>
              <Text style={s.dayHeading}>Day {day.day}: {day.focus}</Text>
              {day.exercises.map((ex, i) => (
                <View key={i} style={s.exerciseRow}>
                  <View style={s.exerciseInfo}>
                    <Text style={s.exerciseName}>{ex.name}</Text>
                    <Text style={s.exerciseDetail}>{ex.sets}×{ex.reps} · {ex.restSeconds}s rest</Text>
                    {ex.notes ? <Text style={s.exerciseNotes}>{ex.notes}</Text> : null}
                  </View>
                  <TouchableOpacity
                    style={s.exerciseTimerButton}
                    onPress={() => navigation.navigate('Timer', { initialSeconds: ex.restSeconds })}
                  >
                    <Text style={s.exerciseTimerText}>⏱</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <View style={s.dayActions}>
                <TouchableOpacity
                  style={s.logDayButton}
                  onPress={() => navigation.navigate('WorkoutLog', {
                    planId: planId.current,
                    day: day.day,
                    focus: day.focus,
                    exercises: day.exercises,
                  })}
                >
                  <Text style={s.logDayButtonText}>Log This Day</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          {structuredPlan.warmup ? <Text style={s.planSection}>Warmup: {structuredPlan.warmup}</Text> : null}
          {structuredPlan.cooldown ? <Text style={s.planSection}>Cooldown: {structuredPlan.cooldown}</Text> : null}
          {structuredPlan.notes ? <Text style={s.planNotes}>{structuredPlan.notes}</Text> : null}
        </ScrollView>
      ) : (
        <ScrollView style={s.planScroll} contentContainerStyle={s.planContent}>
          <Text style={s.planText}>{plan}</Text>
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
  progressContainer: { alignItems: 'center', marginVertical: 24, width: '100%' },
  progressBar: { width: '100%', height: 8, backgroundColor: t.border, borderRadius: 4, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: t.accent, borderRadius: 4 },
  progressText: { color: t.textSecondary, fontSize: 14, marginTop: 8, fontWeight: '600' },
  planScroll: { flex: 1 },
  planContent: { paddingBottom: 20 },
  planText: { color: t.text, fontSize: 14, lineHeight: 22, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  dayCard: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: 10, padding: 16, marginBottom: 16 },
  dayHeading: { fontSize: 18, fontWeight: '700', color: t.text, marginBottom: 12 },
  exerciseRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: t.accent },
  exerciseInfo: { flex: 1 },
  exerciseName: { fontSize: 15, fontWeight: '600', color: t.text },
  exerciseDetail: { fontSize: 13, color: t.textSecondary, marginTop: 2 },
  exerciseNotes: { fontSize: 12, color: t.textMuted, marginTop: 2, fontStyle: 'italic' },
  exerciseTimerButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  exerciseTimerText: { fontSize: 16 },
  planSection: { fontSize: 14, color: t.text, marginBottom: 8, marginTop: 12 },
  planNotes: { fontSize: 13, color: t.textSecondary, marginTop: 12, lineHeight: 20, fontStyle: 'italic' },
  streamRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8 },
  streamText: { color: t.textSecondary, fontSize: 13 },
  actions: { gap: 10, paddingTop: 16, borderTopWidth: 1, borderTopColor: t.border },
  saveButton: { backgroundColor: t.success, padding: 16, borderRadius: 8, alignItems: 'center' },
  savedButton: { opacity: 0.6 },
  saveButtonText: { color: t.successText, fontSize: 16, fontWeight: '700' },
  newButton: { padding: 12, alignItems: 'center' },
  newButtonText: { color: t.accent, fontSize: 15 },
  logDayButton: { backgroundColor: t.accent + '22', padding: 10, borderRadius: 6, borderWidth: 1, borderColor: t.accent, flex: 1, alignItems: 'center' },
  logDayButtonText: { color: t.accent, fontSize: 13, fontWeight: '600' },
  dayActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
})