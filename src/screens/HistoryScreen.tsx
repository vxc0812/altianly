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
import { RootStackParamList, WorkoutPlan, BMIHistoryEntry, WorkoutLog } from '../types'
import {
  getWorkoutHistory, deleteWorkoutPlan, getWorkoutLogsForPlan,
  getBMIHistory, getWorkoutLogs,
} from '../services/storage'
import { useTheme } from '../context/ThemeContext'
import { Theme } from '../constants/theme'

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'History'> }

const evaluationColors: Record<string, string> = {
  underweight: '#58A6FF',
  normal: '#3FB950',
  overweight: '#D29922',
  obese: '#F85149',
}

const evaluationLabels: Record<string, string> = {
  underweight: 'Underweight',
  normal: 'Normal',
  overweight: 'Overweight',
  obese: 'Obese',
}

function computeStreak(entries: BMIHistoryEntry[]): number {
  if (entries.length === 0) return 0
  const seen = new Set<string>()
  for (const e of entries) {
    const d = new Date(e.timestamp)
    seen.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`)
  }
  const dates = [...seen].sort().reverse()
  let streak = 1
  for (let i = 1; i < dates.length; i++) {
    const [y1, m1, d1] = dates[i - 1].split('-').map(Number)
    const [y2, m2, d2] = dates[i].split('-').map(Number)
    const prev = new Date(y1, m1, d1)
    const curr = new Date(y2, m2, d2)
    const diff = (prev.getTime() - curr.getTime()) / (1000 * 60 * 60 * 24)
    if (diff === 1) streak++
    else break
  }
  return streak
}

export default function HistoryScreen({ navigation }: Props) {
  const { theme } = useTheme()
  const s = styles(theme)
  const [plans, setPlans] = useState<WorkoutPlan[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [logCounts, setLogCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [bmiHistory, setBmiHistory] = useState<BMIHistoryEntry[]>([])
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([])

  useFocusEffect(useCallback(() => { loadData() }, []))

  async function loadData() {
    setLoading(true)
    const [plans, bmiEntries, allLogs] = await Promise.all([
      getWorkoutHistory(),
      getBMIHistory(),
      getWorkoutLogs(),
    ])
    setPlans(plans)
    setBmiHistory(bmiEntries)
    setWorkoutLogs(allLogs)
    const counts: Record<string, number> = {}
    for (const p of plans) {
      const logs = await getWorkoutLogsForPlan(p.id)
      counts[p.id] = logs.length
    }
    setLogCounts(counts)
    setLoading(false)
  }

  async function handleDelete(id: string) {
    await deleteWorkoutPlan(id)
    setPlans((prev) => prev.filter((p) => p.id !== id))
  }

  function formatDate(ts: number): string {
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  function formatShortDate(ts: number): string {
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }

  const streak = computeStreak(bmiHistory)
  // BMI chart: show oldest → newest left to right
  const recentEntries = [...bmiHistory.slice(0, 7)].reverse()
  const maxBmi = Math.max(...recentEntries.map((e) => e.bmi), 18.5)
  const minBmi = Math.min(...recentEntries.map((e) => e.bmi), 30)
  const range = Math.max(maxBmi - minBmi, 5)
  const barMaxHeight = 80

  // Workout activity chart: last 7 sessions, oldest → newest left to right
  const recentLogs = [...workoutLogs.slice(0, 7)].reverse()
  const sessionSets = recentLogs.map((l) => l.entries.reduce((sum, e) => sum + e.actualSets, 0))
  const maxSessionSets = Math.max(...sessionSets, 1)
  const totalSessions = workoutLogs.length
  const avgSets = totalSessions > 0
    ? Math.round(workoutLogs.slice(0, 10).reduce((sum, l) => sum + l.entries.reduce((s, e) => s + e.actualSets, 0), 0) / Math.min(totalSessions, 10))
    : 0

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Go back">
          <Text style={s.backText}>{'< Back'}</Text>
        </TouchableOpacity>
        <Text style={s.heading}>History</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Home')}>
          <Text style={s.homeText}>Home</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator color={theme.accent} /></View>
      ) : (
        <ScrollView contentContainerStyle={s.scrollContent}>
          {bmiHistory.length > 0 && (
            <>
              <Text style={s.sectionTitle}>BMI Progress</Text>

              <View style={s.streakCard} accessibilityRole="text" accessibilityLabel={`${streak} day streak, ${bmiHistory.length} total checks, latest BMI ${bmiHistory[0].bmi}`}>
                <View style={s.streakItem}>
                  <Text style={s.streakIcon}>🔥</Text>
                  <Text style={s.streakValue}>{streak}</Text>
                  <Text style={s.streakLabel}>Day Streak</Text>
                </View>
                <View style={s.streakDivider} />
                <View style={s.streakItem}>
                  <Text style={s.streakIcon}>📊</Text>
                  <Text style={s.streakValue}>{bmiHistory.length}</Text>
                  <Text style={s.streakLabel}>Total Checks</Text>
                </View>
                <View style={s.streakDivider} />
                <View style={s.streakItem}>
                  <Text style={s.streakIcon}>📌</Text>
                  <Text style={s.streakValue}>{bmiHistory[0].bmi}</Text>
                  <Text style={s.streakLabel}>Latest BMI</Text>
                </View>
              </View>

              {recentEntries.length > 1 && (
                <View style={s.chartCard} accessibilityRole="text" accessibilityLabel={`BMI trend chart showing last ${recentEntries.length} checks. Latest: ${recentEntries[recentEntries.length - 1].bmi}`}>
                  <Text style={s.chartTitle}>BMI Trend — Last {recentEntries.length} Checks</Text>
                  <View style={s.chart}>
                    {recentEntries.map((entry, i) => {
                      const barHeight = ((entry.bmi - minBmi) / range) * barMaxHeight + 10
                      return (
                        <View key={i} style={s.barColumn}>
                          <Text style={s.barValue}>{entry.bmi}</Text>
                          <View
                            style={[
                              s.bar,
                              {
                                height: barHeight,
                                backgroundColor: evaluationColors[entry.evaluation],
                              },
                            ]}
                          />
                          <Text style={s.barLabel}>{formatShortDate(entry.timestamp)}</Text>
                        </View>
                      )
                    })}
                  </View>
                </View>
              )}

              <View style={s.recentList}>
                <Text style={s.sectionTitle}>Recent Checks</Text>
                {bmiHistory.slice(0, 5).map((entry, i) => (
                  <View key={i} style={s.recentRow} accessibilityRole="text" accessibilityLabel={`BMI ${entry.bmi}, ${evaluationLabels[entry.evaluation]}, age ${entry.age}, ${entry.gender}, on ${formatShortDate(entry.timestamp)}`}>
                    <View style={[s.recentDot, { backgroundColor: evaluationColors[entry.evaluation] }]} />
                    <View style={s.recentInfo}>
                      <Text style={s.recentBmi}>{entry.bmi} - {evaluationLabels[entry.evaluation]}</Text>
                      <Text style={s.recentMeta}>Age {entry.age} - {entry.gender}</Text>
                    </View>
                    <Text style={s.recentDate}>{formatShortDate(entry.timestamp)}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {totalSessions > 0 && (
            <>
              <Text style={s.sectionTitle}>Workout Activity</Text>

              <View style={s.streakCard} accessibilityRole="text" accessibilityLabel={`${totalSessions} total sessions logged, average ${avgSets} sets per session`}>
                <View style={s.streakItem}>
                  <Text style={s.streakIcon}>💪</Text>
                  <Text style={s.streakValue}>{totalSessions}</Text>
                  <Text style={s.streakLabel}>Sessions Logged</Text>
                </View>
                <View style={s.streakDivider} />
                <View style={s.streakItem}>
                  <Text style={s.streakIcon}>📋</Text>
                  <Text style={s.streakValue}>{avgSets}</Text>
                  <Text style={s.streakLabel}>Avg Sets / Session</Text>
                </View>
                <View style={s.streakDivider} />
                <View style={s.streakItem}>
                  <Text style={s.streakIcon}>🎯</Text>
                  <Text numberOfLines={1} style={[s.streakValue, { fontSize: 13 }]}>{workoutLogs[0].focus}</Text>
                  <Text style={s.streakLabel}>Last Focus</Text>
                </View>
              </View>

              {recentLogs.length > 1 && (
                <View style={s.chartCard} accessibilityRole="text" accessibilityLabel={`Workout volume chart showing last ${recentLogs.length} sessions. Latest: ${sessionSets[sessionSets.length - 1]} sets`}>
                  <Text style={s.chartTitle}>Sets Completed — Last {recentLogs.length} Sessions</Text>
                  <View style={s.chart}>
                    {recentLogs.map((log, i) => {
                      const sets = sessionSets[i]
                      const barHeight = (sets / maxSessionSets) * barMaxHeight + 4
                      return (
                        <View key={log.id} style={s.barColumn}>
                          <Text style={s.barValue}>{sets}</Text>
                          <View style={[s.bar, { height: barHeight, backgroundColor: theme.accent }]} />
                          <Text style={s.barLabel}>{formatShortDate(log.timestamp)}</Text>
                        </View>
                      )
                    })}
                  </View>
                </View>
              )}
            </>
          )}

          <Text style={s.sectionTitle}>Saved Workouts</Text>

          {plans.length === 0 ? (
            <View style={s.emptySection}>
              <Text style={s.emptyTitle}>No saved workouts yet</Text>
              <Text style={s.emptySubtitle}>Complete a BMI calculation and generate a workout plan to see it here.</Text>
              <TouchableOpacity style={s.browseButton} onPress={() => navigation.navigate('Home')} accessibilityRole="button" accessibilityLabel="Go to the home screen">
                <Text style={s.browseButtonText}>Go to Home</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={s.list}>
              {plans.map((plan) => {
                const isExpanded = expandedId === plan.id
                return (
                  <View key={plan.id} style={s.card}>
                    <TouchableOpacity
                      style={s.cardHeader}
                      onPress={() => setExpandedId(isExpanded ? null : plan.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Workout from ${formatDate(plan.timestamp)}, BMI ${plan.bmiResult.bmi}, ${isExpanded ? 'tap to collapse' : 'tap to expand'}`}
                    >
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
                        {plan.structuredPlan ? (
                          <>
                            <Text style={s.planName}>{plan.structuredPlan.name}</Text>
                            <Text style={s.startLabel}>Start a day</Text>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.dayRow}>
                              {plan.structuredPlan.days.map((day) => (
                                <TouchableOpacity
                                  key={day.day}
                                  style={s.dayChip}
                                  onPress={() => navigation.navigate('WorkoutLog', {
                                    planId: plan.id,
                                    day: day.day,
                                    focus: day.focus,
                                    exercises: day.exercises,
                                  })}
                                  accessibilityRole="button"
                                  accessibilityLabel={`Start Day ${day.day}: ${day.focus}`}
                                >
                                  <Text style={s.dayChipNumber}>Day {day.day}</Text>
                                  <Text style={s.dayChipFocus} numberOfLines={1}>{day.focus}</Text>
                                </TouchableOpacity>
                              ))}
                            </ScrollView>
                          </>
                        ) : (
                          <Text style={s.planText}>{plan.plan}</Text>
                        )}
                        <View style={s.cardActions}>
                          <TouchableOpacity
                            style={s.logsButton}
                            onPress={() => navigation.navigate('PlanLogs', { planId: plan.id })}
                            accessibilityRole="button"
                            accessibilityLabel={`View ${logCounts[plan.id] ?? 0} workout logs for this plan`}
                          >
                            <Text style={s.logsButtonText}>View Logs ({logCounts[plan.id] ?? 0})</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={s.deleteButton}
                            onPress={() => handleDelete(plan.id)}
                            accessibilityRole="button"
                            accessibilityLabel="Delete this workout plan"
                          >
                            <Text style={s.deleteText}>Delete</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                )
              })}
            </View>
          )}
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
  scrollContent: { padding: 24, paddingTop: 0, paddingBottom: 40 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: t.text, marginBottom: 12, marginTop: 8 },

  streakCard: {
    flexDirection: 'row',
    backgroundColor: t.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: t.border,
    marginBottom: 16,
    paddingVertical: 14,
  },
  streakItem: { flex: 1, alignItems: 'center' },
  streakIcon: { fontSize: 18, marginBottom: 2 },
  streakValue: { fontSize: 20, fontWeight: '800', color: t.accent },
  streakLabel: { fontSize: 11, color: t.textSecondary, marginTop: 2 },
  streakDivider: { width: 1, backgroundColor: t.border },

  chartCard: {
    backgroundColor: t.surface,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
  },
  chartTitle: { color: t.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 16 },
  chart: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  barColumn: { flex: 1, alignItems: 'center' },
  barValue: { color: t.textSecondary, fontSize: 10, marginBottom: 4 },
  bar: { width: 12, borderRadius: 6, minHeight: 4 },
  barLabel: { color: t.textMuted, fontSize: 9, marginTop: 6 },

  recentList: { marginBottom: 16 },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: t.border,
  },
  recentDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  recentInfo: { flex: 1 },
  recentBmi: { color: t.text, fontSize: 14, fontWeight: '600' },
  recentMeta: { color: t.textSecondary, fontSize: 12, marginTop: 2 },
  recentDate: { color: t.textMuted, fontSize: 12 },

  emptySection: { alignItems: 'center', paddingVertical: 32 },
  emptyTitle: { color: t.text, fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptySubtitle: { color: t.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  browseButton: { backgroundColor: t.success, padding: 14, borderRadius: 8 },
  browseButtonText: { color: t.successText, fontSize: 15, fontWeight: '600' },
  list: { gap: 12 },
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
  planName: { color: t.text, fontSize: 15, fontWeight: '700', marginBottom: 12 },
  startLabel: { color: t.textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 },
  dayRow: { gap: 8, paddingBottom: 4 },
  dayChip: { backgroundColor: t.accent + '18', borderWidth: 1, borderColor: t.accent + '40', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, minWidth: 88, alignItems: 'center' },
  dayChipNumber: { color: t.accent, fontSize: 12, fontWeight: '700' },
  dayChipFocus: { color: t.text, fontSize: 11, marginTop: 3, textAlign: 'center' },
  planText: { color: t.text, fontSize: 13, lineHeight: 20, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  cardActions: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  logsButton: { paddingVertical: 8, paddingHorizontal: 12, backgroundColor: t.accent + '22', borderRadius: 6 },
  logsButtonText: { color: t.accent, fontSize: 13, fontWeight: '600' },
  deleteButton: {},
  deleteText: { color: t.danger, fontSize: 14, fontWeight: '600' },
})
