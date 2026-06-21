import React, { useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native'
import { useFocusEffect, RouteProp } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
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
        <TouchableOpacity onPress={() => navigation.navigate('Home')}>
          <Text style={s.homeText}>Home</Text>
        </TouchableOpacity>
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
  homeText: { color: t.accent, fontSize: 16, fontWeight: '600' },
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