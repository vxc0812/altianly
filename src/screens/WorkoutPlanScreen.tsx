import React, { useEffect, useState, useRef } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  Share,
  Alert,
} from 'react-native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RouteProp } from '@react-navigation/native'
import { RootStackParamList, WorkoutPlan, StructuredWorkoutPlan } from '../types'
import { generateWorkoutPlan as llmGenerate, extractStructuredPlan } from '../services/llm'
import { generateWorkoutPlan as localGenerate } from '../services/workoutGen'
import { saveWorkoutPlan, getLLMConfig, getNotionConfig } from '../services/storage'
import { DEFAULT_LLM_CONFIG } from '../constants'
import { useTheme } from '../context/ThemeContext'
import { Theme } from '../constants/theme'
import { exportToNotion, buildPlanName } from '../services/notion'

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'WorkoutPlan'>
  route: RouteProp<RootStackParamList, 'WorkoutPlan'>
}

export default function WorkoutPlanScreen({ navigation, route }: Props) {
  const { theme } = useTheme()
  const s = styles(theme)
  const { userInput, bmiResult, answers, mode } = route.params
  const [plan, setPlan] = useState('')
  const [structuredPlan, setStructuredPlan] = useState<StructuredWorkoutPlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [progress, setProgress] = useState(0)
  const [providerName, setProviderName] = useState<string>('ollama')
  const [notionMsg, setNotionMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const savedRef = useRef(false)
  const [notionBusy, setNotionBusy] = useState(false)
  const tokenCount = useRef(0)

  useEffect(() => { loadPlan() }, [])

  async function loadPlan() {
    setLoading(true)
    setError('')
    setProgress(0)
    tokenCount.current = 0

    if (mode === 'instant') {
      const structured = localGenerate({
        age: userInput.age,
        lifestyle: answers.lifestyle,
        exerciseLevel: answers.exerciseLevel,
        split: answers.trainingSplit,
      })
      setStructuredPlan(structured)
      setPlan(JSON.stringify(structured, null, 2))
      setLoading(false)
      return
    }

    try {
      const storedConfig = await getLLMConfig()
      const config = storedConfig || DEFAULT_LLM_CONFIG
      setProviderName(config.provider)
      let fullPlan = ''
      const resultText = await llmGenerate(
        config,
        {
          age: userInput.age,
          gender: userInput.gender,
          bmi: bmiResult.bmi,
          evaluation: bmiResult.evaluation,
          lifestyle: answers.lifestyle,
          exerciseLevel: answers.exerciseLevel,
          split: answers.trainingSplit,
          questionnaire: answers,
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
      const finalText = fullPlan || resultText || ''
      if (!finalText.trim()) {
        setError('The AI returned an empty response. Check your provider settings or try a different model.')
        return
      }
      const result = extractStructuredPlan(finalText)
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
      id: Date.now().toString(),
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

  async function handleCopy() {
    const text = structuredPlan
      ? structuredPlan.days.map((d) =>
          `Day ${d.day}: ${d.focus}\n${
            d.exercises.map((e) => `  ${e.name}: ${e.sets} x ${e.reps}${e.restSeconds ? ` (${e.restSeconds}s rest)` : ''}`).join('\n')
          }`
        ).join('\n\n')
      : plan
    if (Platform.OS === 'web') {
      try { await navigator.clipboard.writeText(text) } catch {}
    }
    Alert.alert('Copied', 'Workout plan copied to clipboard')
  }

  async function handleShare() {
    const text = structuredPlan
      ? `# ${structuredPlan.name || 'Workout Plan'}\n\n${
          structuredPlan.days.map((d) =>
            `## Day ${d.day}: ${d.focus}\n${
              d.exercises.map((e) => `- ${e.name}: ${e.sets} x ${e.reps}${e.restSeconds ? ` (${e.restSeconds}s rest)` : ''}${e.notes ? ` — ${e.notes}` : ''}`).join('\n')
            }`
          ).join('\n\n')
        }${structuredPlan.warmup ? `\n\n## Warm-up\n${structuredPlan.warmup}` : ''}${structuredPlan.cooldown ? `\n\n## Cool-down\n${structuredPlan.cooldown}` : ''}${structuredPlan.notes ? `\n\n## Notes\n${structuredPlan.notes}` : ''}`
      : plan
    await Share.share({ message: text, title: 'Workout Plan' })
  }

  async function handleExportNotion() {
    setNotionBusy(true)
    setNotionMsg(null)
    try {
      if (!structuredPlan) {
        setNotionMsg({ type: 'err', text: 'No structured plan — generate with AI mode.' })
        setNotionBusy(false)
        return
      }
      const cfg = await getNotionConfig()
      if (!cfg) {
        setNotionMsg({ type: 'err', text: 'Set up Notion in Settings first.' })
        setNotionBusy(false)
        return
      }
      setNotionMsg({ type: 'ok', text: 'Exporting...' })
      const result = await exportToNotion(
        cfg,
        buildPlanName(structuredPlan),
        structuredPlan,
        plan,
        bmiResult.bmi.toString(),
        bmiResult.evaluation,
      )
      setNotionBusy(false)
      if (result.ok) {
        setNotionMsg({ type: 'ok', text: 'Saved to Notion!' })
      } else {
        setNotionMsg({ type: 'err', text: result.error || 'Unknown error' })
      }
    } catch (e: any) {
      setNotionBusy(false)
      setNotionMsg({ type: 'err', text: e?.message || 'Unexpected error' })
    }
  }

  function getErrorHint(err: string, provider: string): string {
    if (err.includes('429') || err.includes('rate limit') || err.includes('rate-limit')) {
      return 'This model is rate-limited. Try a different free model in Settings, or wait a moment and retry.'
    }
    if (provider === 'ollama') return 'Ensure Ollama is running at localhost:11434 and the model is pulled.'
    if (provider === 'openrouter') return 'Check your API key and model name in Settings.'
    if (provider === 'cloudflare') return 'Ensure the Cloudflare AI worker is deployed and the URL is correct in Settings.'
    return 'Check your provider configuration in Settings.'
  }

  return (
    <View style={s.container}>
      <Text style={s.heading}>Your Workout Plan</Text>

      {loading && !plan ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={s.loadingText}>Generating your personalized plan...</Text>
          {providerName === 'ollama' && (
            <Text style={s.loadingSubtext}>Make sure Ollama is running on your device</Text>
          )}
        </View>
      ) : error && !plan ? (
        <View style={s.center}>
          <Text style={s.errorText}>{error}</Text>
          <Text style={s.errorHint}>{getErrorHint(error, providerName)}</Text>
          <TouchableOpacity style={s.retryButton} onPress={loadPlan}>
            <Text style={s.retryButtonText}>Retry</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.retryButton} onPress={() => navigation.navigate('Settings')}>
            <Text style={s.retryButtonText}>Open Settings</Text>
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
          {providerName === 'ollama' && (
            <Text style={s.loadingSubtext}>Make sure Ollama is running on your device</Text>
          )}
        </View>
      ) : structuredPlan ? (
        <ScrollView style={s.planScroll} contentContainerStyle={s.planContent}>
          {structuredPlan.days.map((day) => (
            <View key={day.day} style={s.dayCard}>
              <Text style={s.dayHeading}>Day {day.day}: {day.focus}</Text>
              {day.exercises.map((ex, i) => (
                <View key={i} style={s.exerciseRow}>
                  <Text style={s.exerciseName}>{ex.name}</Text>
                  <Text style={s.exerciseDetail}>{ex.sets} x {ex.reps} - {ex.restSeconds}s rest</Text>
                  {ex.notes ? <Text style={s.exerciseNotes}>{ex.notes}</Text> : null}
                </View>
              ))}
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

      {!!plan && !loading && (
        <Text style={s.disclaimer}>
          These exercises are designed for general fitness. If you have a medical condition, recent injury, chronic pain, or haven't been active in a while, consult a healthcare professional before starting. Stop immediately if you feel chest pain, dizziness, or shortness of breath.
        </Text>
      )}

      {!!plan && !loading && (
        <View style={s.actions}>
          <TouchableOpacity style={[s.saveButton, saved && s.savedButton]} onPress={handleSave} disabled={saved}>
            <Text style={s.saveButtonText}>{saved ? 'Saved' : 'Save Plan'}</Text>
          </TouchableOpacity>
          <View style={s.exportRow}>
            <TouchableOpacity style={s.exportButton} onPress={handleCopy}>
              <Text style={s.exportButtonText}>Copy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.exportButton} onPress={handleShare}>
              <Text style={s.exportButtonText}>Share</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.exportButton} onPress={handleExportNotion}>
              <Text style={s.exportButtonText}>{notionBusy ? '...' : 'Notion'}</Text>
            </TouchableOpacity>
          </View>
          {notionMsg && (
            <View style={[s.notionBanner, notionMsg.type === 'ok' ? s.notionBannerOk : s.notionBannerErr]}>
              <Text style={[s.notionBannerText, notionMsg.type === 'ok' ? s.notionBannerTextOk : s.notionBannerTextErr]}>
                {notionMsg.text}
              </Text>
            </View>
          )}
          <TouchableOpacity style={s.secondaryButton} onPress={() => navigation.goBack()}>
            <Text style={s.secondaryButtonText}>Back to Questionnaire</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.secondaryButton} onPress={() => navigation.navigate('Home')}>
            <Text style={s.secondaryButtonText}>Home</Text>
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
  exerciseRow: { marginBottom: 10, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: t.accent },
  exerciseName: { fontSize: 15, fontWeight: '600', color: t.text },
  exerciseDetail: { fontSize: 13, color: t.textSecondary, marginTop: 2 },
  exerciseNotes: { fontSize: 12, color: t.textMuted, marginTop: 2, fontStyle: 'italic' },
  planSection: { fontSize: 14, color: t.text, marginBottom: 8, marginTop: 12 },
  planNotes: { fontSize: 13, color: t.textSecondary, marginTop: 12, lineHeight: 20, fontStyle: 'italic' },
  streamRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 8 },
  streamText: { color: t.textSecondary, fontSize: 13 },
  disclaimer: {
    fontSize: 12, color: t.danger, lineHeight: 17, textAlign: 'center',
    paddingHorizontal: 8, paddingVertical: 16, marginTop: 16,
    borderTopWidth: 1, borderTopColor: t.border,
  },
  actions: { gap: 10, paddingTop: 16, borderTopWidth: 1, borderTopColor: t.border },
  saveButton: { backgroundColor: t.success, padding: 16, borderRadius: 8, alignItems: 'center' },
  savedButton: { opacity: 0.6 },
  saveButtonText: { color: t.successText, fontSize: 16, fontWeight: '700' },
  exportRow: { flexDirection: 'row', gap: 8 },
  exportButton: {
    flex: 1, padding: 12, alignItems: 'center', borderRadius: 8,
    backgroundColor: t.surface, borderWidth: 1, borderColor: t.accent,
  },
  exportButtonText: { color: t.accent, fontSize: 14, fontWeight: '600' },
  secondaryButton: { padding: 12, alignItems: 'center' },
  secondaryButtonText: { color: t.accent, fontSize: 15 },
  notionBanner: { borderRadius: 6, padding: 10, alignItems: 'center' },
  notionBannerOk: { backgroundColor: t.success + '20' },
  notionBannerErr: { backgroundColor: t.danger + '20' },
  notionBannerText: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  notionBannerTextOk: { color: t.success },
  notionBannerTextErr: { color: t.danger },
})