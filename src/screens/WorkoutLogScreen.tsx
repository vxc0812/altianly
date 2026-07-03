import React, { useState, useEffect, useRef } from 'react'
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

  const [disclaimerAccepted, setDisclaimerAccepted] = useState(false)
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

  const [activeTimerIdx, setActiveTimerIdx] = useState<number | null>(null)
  const [timerRemaining, setTimerRemaining] = useState(0)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => () => { if (intervalRef.current) clearInterval(intervalRef.current) }, [])

  function clearTimerInterval() {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
  }

  function startTimer(idx: number, restSeconds: number) {
    clearTimerInterval()
    setActiveTimerIdx(idx)
    setTimerRemaining(restSeconds)
    intervalRef.current = setInterval(() => {
      setTimerRemaining((prev) => {
        if (prev <= 1) { clearTimerInterval(); setActiveTimerIdx(null); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  function stopTimer() {
    clearTimerInterval()
    setActiveTimerIdx(null)
    setTimerRemaining(0)
  }

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
        <TouchableOpacity onPress={() => navigation.navigate('Home')}>
          <Text style={s.homeText}>Home</Text>
        </TouchableOpacity>
      </View>

      {!disclaimerAccepted ? (
        <View style={s.disclaimerCard}>
          <Text style={s.disclaimerTitle}>Before You Begin</Text>
          <Text style={s.disclaimerText}>
            These exercises are designed for general fitness. If you have a medical condition, recent injury, chronic pain, or haven't been active in a while, consult a healthcare professional before starting. Stop immediately if you feel chest pain, dizziness, or shortness of breath.
          </Text>
          <TouchableOpacity
            style={s.checkboxRow}
            onPress={() => setDisclaimerAccepted(true)}
            activeOpacity={0.7}
          >
            <View style={[s.checkbox, disclaimerAccepted && s.checkboxChecked]}>
              {disclaimerAccepted && <Text style={s.checkmark}>✓</Text>}
            </View>
            <Text style={s.checkboxLabel}>I understand and agree to proceed</Text>
          </TouchableOpacity>
        </View>
      ) : (
      <>
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

          <View style={s.restRow}>
            {activeTimerIdx === i ? (
              <>
                <Text style={[s.restCountdown, timerRemaining <= 10 && s.restCountdownUrgent]}>
                  {String(Math.floor(timerRemaining / 60)).padStart(2, '0')}:{String(timerRemaining % 60).padStart(2, '0')}
                </Text>
                <TouchableOpacity style={s.restStopBtn} onPress={stopTimer} accessibilityRole="button" accessibilityLabel="Stop rest timer">
                  <Text style={s.restStopText}>Stop</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={s.restBtn}
                onPress={() => startTimer(i, exercises[i].restSeconds)}
                accessibilityRole="button"
                accessibilityLabel={`Start ${exercises[i].restSeconds} second rest timer`}
              >
                <Text style={s.restBtnText}>Rest {exercises[i].restSeconds}s</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ))}

      <TouchableOpacity style={s.saveButton} onPress={handleSave}>
        <Text style={s.saveButtonText}>Save Log</Text>
      </TouchableOpacity>
      </>)}
    </ScrollView>
  )
}

const styles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  content: { padding: 24, paddingTop: 0, paddingBottom: 40 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 24, paddingTop: 60 },
  backText: { color: t.accent, fontSize: 16 },
  homeText: { color: t.accent, fontSize: 16, fontWeight: '600' },
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
  restRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', marginTop: 12, gap: 10 },
  restBtn: { backgroundColor: t.accent + '18', borderWidth: 1, borderColor: t.accent + '40', borderRadius: 16, paddingHorizontal: 14, paddingVertical: 6 },
  restBtnText: { color: t.accent, fontSize: 13, fontWeight: '600' },
  restCountdown: { fontSize: 22, fontWeight: '800', color: t.accent, fontVariant: ['tabular-nums'] },
  restCountdownUrgent: { color: t.danger },
  restStopBtn: { backgroundColor: t.danger + '18', borderWidth: 1, borderColor: t.danger + '40', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 6 },
  restStopText: { color: t.danger, fontSize: 13, fontWeight: '600' },
  disclaimerCard: {
    backgroundColor: t.surface, borderWidth: 1, borderColor: t.danger + '50',
    borderRadius: 12, padding: 24, marginTop: 16,
  },
  disclaimerTitle: { fontSize: 18, fontWeight: '800', color: t.text, textAlign: 'center', marginBottom: 16 },
  disclaimerText: {
    fontSize: 14, color: t.textSecondary, lineHeight: 22, textAlign: 'center',
    marginBottom: 24,
  },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  checkbox: {
    width: 24, height: 24, borderRadius: 4, borderWidth: 2, borderColor: t.accent,
    alignItems: 'center', justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: t.accent },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  checkboxLabel: { color: t.text, fontSize: 15, fontWeight: '600' },
})