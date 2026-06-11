import React, { useCallback, useState } from 'react'
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
import { useFocusEffect } from '@react-navigation/native'
import { RootStackParamList, WorkoutPlan } from '../types'
import { getWorkoutHistory, deleteWorkoutPlan } from '../services/storage'
import { useTheme } from '../context/ThemeContext'
import { Theme } from '../constants/theme'

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'History'> }

const evaluationColors: Record<string, string> = {
  underweight: '#58A6FF',
  normal: '#3FB950',
  overweight: '#D29922',
  obese: '#F85149',
}

export default function HistoryScreen({ navigation }: Props) {
  const { theme } = useTheme()
  const s = styles(theme)
  const [plans, setPlans] = useState<WorkoutPlan[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useFocusEffect(useCallback(() => { loadPlans() }, []))

  async function loadPlans() {
    setLoading(true)
    setPlans(await getWorkoutHistory())
    setLoading(false)
  }

  async function handleDelete(id: string) {
    await deleteWorkoutPlan(id)
    setPlans((prev) => prev.filter((p) => p.id !== id))
  }

  function formatDate(ts: number): string {
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.backText}>{'< Back'}</Text>
        </TouchableOpacity>
        <Text style={s.heading}>Saved Workouts</Text>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={theme.accent} /></View>
      ) : plans.length === 0 ? (
        <View style={s.center}>
          <Text style={s.emptyTitle}>No saved workouts yet</Text>
          <Text style={s.emptySubtitle}>Complete a BMI calculation and generate a workout plan to see it here.</Text>
          <TouchableOpacity style={s.browseButton} onPress={() => navigation.navigate('Home')}>
            <Text style={s.browseButtonText}>Go to Home</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.list}>
          {plans.map((plan) => {
            const isExpanded = expandedId === plan.id
            return (
              <View key={plan.id} style={s.card}>
                <TouchableOpacity style={s.cardHeader} onPress={() => setExpandedId(isExpanded ? null : plan.id)}>
                  <View style={s.cardInfo}>
                    <Text style={s.cardDate}>{formatDate(plan.timestamp)}</Text>
                    <View style={s.badgeRow}>
                      <View style={[s.badge, { backgroundColor: evaluationColors[plan.bmiResult.evaluation] + '22' }]}>
                        <Text style={[s.badgeText, { color: evaluationColors[plan.bmiResult.evaluation] }]}>
                          BMI {plan.bmiResult.bmi} - {plan.bmiResult.evaluation}
                        </Text>
                      </View>
                      <Text style={s.cardMeta}>{plan.answers.lifestyle} / {plan.answers.exerciseLevel}</Text>
                    </View>
                  </View>
                  <Text style={s.expandIcon}>{isExpanded ? '▲' : '▼'}</Text>
                </TouchableOpacity>

                {isExpanded && (
                  <View style={s.cardBody}>
                    <Text style={s.planText}>{plan.plan}</Text>
                    <TouchableOpacity style={s.deleteButton} onPress={() => handleDelete(plan.id)}>
                      <Text style={s.deleteText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )
          })}
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
  deleteButton: { marginTop: 16, alignSelf: 'flex-end' },
  deleteText: { color: t.danger, fontSize: 14, fontWeight: '600' },
})
