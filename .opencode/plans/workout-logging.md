# Feature D: Workout Logging + Remove Exercise Browser

## Files to Delete
- `src/screens/ExerciseBrowserScreen.tsx`

---

## 1. `src/types/index.ts`

**Replace lines 42-52** with:

```ts
export interface WorkoutLogEntry {
  exerciseName: string
  plannedSets: number
  plannedReps: string
  actualSets: number
  actualReps: string
  weight: string
  notes: string
}

export interface WorkoutLog {
  id: string
  planId: string
  day: number
  focus: string
  timestamp: number
  entries: WorkoutLogEntry[]
}

export type RootStackParamList = {
  Home: undefined
  Result: { userInput: UserInput }
  Questionnaire: { userInput: UserInput; bmiResult: BMIResult }
  WorkoutPlan: { userInput: UserInput; bmiResult: BMIResult; answers: QuestionnaireAnswers }
  Settings: undefined
  History: undefined
  Timer: { initialSeconds?: number }
  WorkoutLog: { planId: string; day: number; focus: string; exercises: WorkoutExercise[] }
  PlanLogs: { planId: string }
}
```

---

## 2. `src/constants/index.ts`

**Replace `STORAGE_KEYS` block** (lines 24-27) with:

```ts
export const STORAGE_KEYS = {
  WORKOUT_HISTORY: 'altianly_workout_history',
  LLM_CONFIG: 'altianly_llm_config',
  WORKOUT_LOGS: 'altianly_workout_logs',
} as const
```

---

## 3. `src/services/storage.ts`

**Replace entire file** with:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage'
import { WorkoutPlan, LLMConfig, WorkoutLog } from '../types'
import { STORAGE_KEYS } from '../constants'

async function secureSet(key: string, value: string): Promise<void> {
  try {
    const SecureStore = require('expo-secure-store')
    await SecureStore.setItemAsync(key, value)
  } catch {
    await AsyncStorage.setItem(key, value)
  }
}

async function secureGet(key: string): Promise<string | null> {
  try {
    const SecureStore = require('expo-secure-store')
    return await SecureStore.getItemAsync(key)
  } catch {
    return await AsyncStorage.getItem(key)
  }
}

export async function saveWorkoutPlan(plan: WorkoutPlan): Promise<void> {
  const json = await AsyncStorage.getItem(STORAGE_KEYS.WORKOUT_HISTORY)
  const history: WorkoutPlan[] = json ? JSON.parse(json) : []
  history.unshift(plan)
  await AsyncStorage.setItem(STORAGE_KEYS.WORKOUT_HISTORY, JSON.stringify(history.slice(0, 50)))
}

export async function getWorkoutHistory(): Promise<WorkoutPlan[]> {
  const json = await AsyncStorage.getItem(STORAGE_KEYS.WORKOUT_HISTORY)
  return json ? JSON.parse(json) : []
}

export async function deleteWorkoutPlan(id: string): Promise<void> {
  const json = await AsyncStorage.getItem(STORAGE_KEYS.WORKOUT_HISTORY)
  if (!json) return
  const history: WorkoutPlan[] = JSON.parse(json)
  await AsyncStorage.setItem(
    STORAGE_KEYS.WORKOUT_HISTORY,
    JSON.stringify(history.filter((p) => p.id !== id))
  )
}

export async function saveLLMConfig(config: LLMConfig): Promise<void> {
  await secureSet(STORAGE_KEYS.LLM_CONFIG, JSON.stringify(config))
}

export async function getLLMConfig(): Promise<LLMConfig | null> {
  const json = await secureGet(STORAGE_KEYS.LLM_CONFIG)
  return json ? JSON.parse(json) : null
}

export async function saveWorkoutLog(log: WorkoutLog): Promise<void> {
  const json = await AsyncStorage.getItem(STORAGE_KEYS.WORKOUT_LOGS)
  const logs: WorkoutLog[] = json ? JSON.parse(json) : []
  logs.unshift(log)
  await AsyncStorage.setItem(STORAGE_KEYS.WORKOUT_LOGS, JSON.stringify(logs.slice(0, 200)))
}

export async function getWorkoutLogs(): Promise<WorkoutLog[]> {
  const json = await AsyncStorage.getItem(STORAGE_KEYS.WORKOUT_LOGS)
  return json ? JSON.parse(json) : []
}

export async function getWorkoutLogsForPlan(planId: string): Promise<WorkoutLog[]> {
  const logs = await getWorkoutLogs()
  return logs.filter((l) => l.planId === planId).sort((a, b) => b.timestamp - a.timestamp)
}

export async function deleteWorkoutLog(id: string): Promise<void> {
  const json = await AsyncStorage.getItem(STORAGE_KEYS.WORKOUT_LOGS)
  if (!json) return
  const logs: WorkoutLog[] = JSON.parse(json)
  await AsyncStorage.setItem(STORAGE_KEYS.WORKOUT_LOGS, JSON.stringify(logs.filter((l) => l.id !== id)))
}
```

---

## 4. `src/screens/WorkoutLogScreen.tsx` — New File

```tsx
import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RouteProp } from '@react-navigation/native'
import { RootStackParamList, WorkoutLog, WorkoutLogEntry } from '../types'
import { saveWorkoutLog } from '../services/storage'
import { useTheme } from '../context/ThemeContext'
import { Theme } from '../constants/theme'

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'WorkoutLog'>
  route: RouteProp<RootStackParamList, 'WorkoutLog'>
}

export default function WorkoutLogScreen({ navigation, route }: Props) {
  const { theme } = useTheme()
  const s = styles(theme)
  const { planId, day, focus, exercises } = route.params

  const [entries, setEntries] = useState<WorkoutLogEntry[]>(
    exercises.map((ex) => ({
      exerciseName: ex.name,
      plannedSets: ex.sets,
      plannedReps: ex.reps,
      actualSets: ex.sets,
      actualReps: ex.reps,
      weight: '',
      notes: '',
    }))
  )

  function updateEntry(index: number, field: keyof WorkoutLogEntry, value: string | number) {
    setEntries((prev) => {
      const next = [...prev]
      next[index] = { ...next[index], [field]: value }
      return next
    })
  }

  async function handleSave() {
    const log: WorkoutLog = {
      id: Date.now().toString(),
      planId,
      day,
      focus,
      timestamp: Date.now(),
      entries,
    }
    await saveWorkoutLog(log)
    Alert.alert('Logged!', `Day ${day}: ${focus} saved to workout logs.`, [
      { text: 'OK', onPress: () => navigation.goBack() },
    ])
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.backText}>{'< Back'}</Text>
        </TouchableOpacity>
        <Text style={s.heading}>Day {day}: {focus}</Text>
        <View style={{ width: 60 }} />
      </View>

      {entries.map((entry, i) => (
        <View key={i} style={s.card}>
          <Text style={s.exerciseName}>{entry.exerciseName}</Text>
          <Text style={s.planned}>Planned: {entry.plannedSets}×{entry.plannedReps}</Text>

          <View style={s.row}>
            <View style={s.field}>
              <Text style={s.label}>Sets</Text>
              <TextInput
                style={s.input}
                keyboardType="number-pad"
                value={String(entry.actualSets)}
                onChangeText={(v) => updateEntry(i, 'actualSets', Number(v) || 0)}
              />
            </View>
            <View style={s.field}>
              <Text style={s.label}>Reps</Text>
              <TextInput
                style={s.input}
                value={entry.actualReps}
                onChangeText={(v) => updateEntry(i, 'actualReps', v)}
              />
            </View>
            <View style={s.field}>
              <Text style={s.label}>Weight</Text>
              <TextInput
                style={s.input}
                placeholder="e.g. 50lbs"
                placeholderTextColor={theme.textMuted}
                value={entry.weight}
                onChangeText={(v) => updateEntry(i, 'weight', v)}
              />
            </View>
          </View>

          <Text style={s.label}>Notes</Text>
          <TextInput
            style={s.notesInput}
            placeholder="How did this feel?"
            placeholderTextColor={theme.textMuted}
            value={entry.notes}
            onChangeText={(v) => updateEntry(i, 'notes', v)}
            multiline
          />
        </View>
      ))}

      <TouchableOpacity style={s.saveButton} onPress={handleSave}>
        <Text style={s.saveButtonText}>Save Log</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  content: { padding: 24, paddingTop: 0, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 24, paddingTop: 60 },
  backText: { color: t.accent, fontSize: 16 },
  heading: { color: t.text, fontSize: 20, fontWeight: '700', flex: 1, textAlign: 'center' },
  card: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: 10, padding: 16, marginBottom: 16 },
  exerciseName: { fontSize: 16, fontWeight: '700', color: t.text, marginBottom: 2 },
  planned: { fontSize: 13, color: t.textSecondary, marginBottom: 12 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  field: { flex: 1 },
  label: { fontSize: 12, color: t.textSecondary, marginBottom: 4, fontWeight: '600' },
  input: { backgroundColor: t.bg, borderWidth: 1, borderColor: t.border, borderRadius: 6, padding: 10, fontSize: 14, color: t.text },
  notesInput: { backgroundColor: t.bg, borderWidth: 1, borderColor: t.border, borderRadius: 6, padding: 10, fontSize: 14, color: t.text, minHeight: 60, textAlignVertical: 'top' },
  saveButton: { backgroundColor: t.success, padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  saveButtonText: { color: t.successText, fontSize: 16, fontWeight: '700' },
})
```

---

## 5. `src/screens/PlanLogsScreen.tsx` — New File

```tsx
import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  useFocusEffect,
} from 'react-native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RouteProp } from '@react-navigation/native'
import { RootStackParamList, WorkoutLog } from '../types'
import { getWorkoutLogsForPlan, deleteWorkoutLog } from '../services/storage'
import { useTheme } from '../context/ThemeContext'
import { Theme } from '../constants/theme'

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'PlanLogs'>
  route: RouteProp<RootStackParamList, 'PlanLogs'>
}

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function PlanLogsScreen({ navigation, route }: Props) {
  const { theme } = useTheme()
  const s = styles(theme)
  const { planId } = route.params
  const [logs, setLogs] = useState<WorkoutLog[]>([])

  useFocusEffect(
    React.useCallback(() => {
      getWorkoutLogsForPlan(planId).then(setLogs)
    }, [planId])
  )

  async function handleDelete(id: string) {
    await deleteWorkoutLog(id)
    setLogs((prev) => prev.filter((l) => l.id !== id))
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.backText}>{'< Back'}</Text>
        </TouchableOpacity>
        <Text style={s.heading}>Workout Logs</Text>
        <View style={{ width: 60 }} />
      </View>

      {logs.length === 0 ? (
        <View style={s.center}>
          <Text style={s.emptyTitle}>No logs yet</Text>
          <Text style={s.emptySubtitle}>Complete a workout day and log it to see entries here.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.list}>
          {logs.map((log) => (
            <View key={log.id} style={s.card}>
              <Text style={s.dayHeading}>Day {log.day}: {log.focus}</Text>
              <Text style={s.dateText}>{fmtDate(log.timestamp)}</Text>
              {log.entries.map((entry, i) => (
                <View key={i} style={s.entryRow}>
                  <Text style={s.entryName}>{entry.exerciseName}</Text>
                  <Text style={s.entryDetail}>
                    {entry.actualSets}×{entry.actualReps}
                    {entry.weight ? ` @ ${entry.weight}` : ''}
                    <Text style={s.entryPlanned}>  (planned: {entry.plannedSets}×{entry.plannedReps})</Text>
                  </Text>
                  {entry.notes ? <Text style={s.entryNotes}>{entry.notes}</Text> : null}
                </View>
              ))}
              <TouchableOpacity style={s.deleteButton} onPress={() => handleDelete(log.id)}>
                <Text style={s.deleteText}>Delete</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  )
}

const styles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 24, paddingTop: 60 },
  backText: { color: t.accent, fontSize: 16 },
  heading: { color: t.text, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyTitle: { color: t.text, fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptySubtitle: { color: t.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20 },
  list: { padding: 24, paddingTop: 0, gap: 12, paddingBottom: 40 },
  card: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: 10, padding: 16 },
  dayHeading: { fontSize: 16, fontWeight: '700', color: t.text },
  dateText: { fontSize: 12, color: t.textSecondary, marginBottom: 12, marginTop: 2 },
  entryRow: { marginBottom: 10, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: t.accent },
  entryName: { fontSize: 14, fontWeight: '600', color: t.text },
  entryDetail: { fontSize: 13, color: t.textSecondary, marginTop: 2 },
  entryPlanned: { fontSize: 12, color: t.textMuted },
  entryNotes: { fontSize: 12, color: t.textMuted, marginTop: 2, fontStyle: 'italic' },
  deleteButton: { marginTop: 8, alignSelf: 'flex-end' },
  deleteText: { color: t.danger, fontSize: 14, fontWeight: '600' },
})
```

---

## 6. `src/screens/WorkoutPlanScreen.tsx` — Edit

### 6a. After line 35 (`const savedRef = useRef(false)`), add:
```ts
const planId = useRef(Date.now().toString())
```

### 6b. Replace `handleSave` function (lines 79-92) with:
```ts
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
```

### 6c. Replace the structuredPlan rendering block (lines 124-140) with:
```tsx
        <ScrollView style={s.planScroll} contentContainerStyle={s.planContent}>
          {structuredPlan.days.map((day) => (
            <View key={day.day} style={s.dayCard}>
              <Text style={s.dayHeading}>Day {day.day}: {day.focus}</Text>
              {day.exercises.map((ex, i) => (
                <View key={i} style={s.exerciseRow}>
                  <Text style={s.exerciseName}>{ex.name}</Text>
                  <Text style={s.exerciseDetail}>{ex.sets}×{ex.reps} · {ex.restSeconds}s rest</Text>
                  {ex.notes ? <Text style={s.exerciseNotes}>{ex.notes}</Text> : null}
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
```

### 6d. Add to styles object (before closing `})`):
```ts
  logDayButton: { backgroundColor: t.accent + '22', padding: 10, borderRadius: 6, borderWidth: 1, borderColor: t.accent, flex: 1, alignItems: 'center' },
  logDayButtonText: { color: t.accent, fontSize: 13, fontWeight: '600' },
  dayActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
```

---

## 7. `src/screens/HistoryScreen.tsx` — Edit

### 7a. Update import (line 14):
Replace:
```ts
import { getWorkoutHistory, deleteWorkoutPlan } from '../services/storage'
```
With:
```ts
import { getWorkoutHistory, deleteWorkoutPlan, getWorkoutLogsForPlan } from '../services/storage'
```

### 7b. Add state after line 31:
```ts
const [logCounts, setLogCounts] = useState<Record<string, number>>({})
```

### 7c. Replace `loadPlans()` (lines 36-39) with:
```ts
async function loadPlans() {
  setLoading(true)
  const plans = await getWorkoutHistory()
  setPlans(plans)
  const counts: Record<string, number> = {}
  for (const p of plans) {
    const logs = await getWorkoutLogsForPlan(p.id)
    counts[p.id] = logs.length
  }
  setLogCounts(counts)
  setLoading(false)
}
```

### 7d. Replace expanded card body (lines 92-98) with:
```tsx
                {isExpanded && (
                  <View style={s.cardBody}>
                    <Text style={s.planText}>{plan.plan}</Text>
                    <View style={s.cardActions}>
                      <TouchableOpacity
                        style={s.logsButton}
                        onPress={() => navigation.navigate('PlanLogs', { planId: plan.id })}
                      >
                        <Text style={s.logsButtonText}>
                          View Logs ({logCounts[plan.id] ?? 0})
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={s.deleteButton} onPress={() => handleDelete(plan.id)}>
                        <Text style={s.deleteText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
```

### 7e. Replace the styles block (lines 109-133) with:
```tsx
const styles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 24, paddingTop: 60 },
  backText: { color: t.accent, fontSize: 16 },
  heading: { color: t.text, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyTitle: { color: t.text, fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptySubtitle: { color: t.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  browseButton: { backgroundColor: t.success, padding: 14, borderRadius: 8 },
  browseButtonText: { color: t.successText, fontSize: 15, fontWeight: '600' },
  list: { padding: 24, paddingTop: 0, gap: 12, paddingBottom: 40 },
  card: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: 10, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  cardInfo: { flex: 1, marginRight: 12 },
  cardDate: { color: t.text, fontSize: 14, fontWeight: '600', marginBottom: 6 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  cardMeta: { color: t.textSecondary, fontSize: 12 },
  expandIcon: { color: t.textSecondary, fontSize: 12 },
  cardBody: { borderTopWidth: 1, borderTopColor: t.border, padding: 16 },
  planText: { color: t.text, fontSize: 13, lineHeight: 20, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  cardActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  logsButton: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: t.accent + '22', borderRadius: 6 },
  logsButtonText: { color: t.accent, fontSize: 13, fontWeight: '600' },
  deleteButton: {},
  deleteText: { color: t.danger, fontSize: 14, fontWeight: '600' },
})
```

---

## 8. `src/screens/HomeScreen.tsx` — Remove browse link + `Linking`

- Remove `Linking` from React Native import
- Remove the `<TouchableOpacity style={s.browseLink}>` block
- Remove `browseLink` and `browseLinkText` from styles

---

## 9. `App.tsx` — Remove ExerciseBrowser, add WorkoutLog + PlanLogs

### Imports:
```tsx
import WorkoutLogScreen from './src/screens/WorkoutLogScreen'
import PlanLogsScreen from './src/screens/PlanLogsScreen'
```
Remove `import ExerciseBrowserScreen from './src/screens/ExerciseBrowserScreen'`

### Screens:
```tsx
<Stack.Screen name="Home" component={HomeScreen} />
<Stack.Screen name="Result" component={ResultScreen} />
<Stack.Screen name="Questionnaire" component={QuestionnaireScreen} />
<Stack.Screen name="WorkoutPlan" component={WorkoutPlanScreen} />
<Stack.Screen name="Settings" component={SettingsScreen} />
<Stack.Screen name="History" component={HistoryScreen} />
<Stack.Screen name="Timer" component={TimerScreen} />
<Stack.Screen name="WorkoutLog" component={WorkoutLogScreen} />
<Stack.Screen name="PlanLogs" component={PlanLogsScreen} />
```
Remove `<Stack.Screen name="ExerciseBrowser" .../>`
