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