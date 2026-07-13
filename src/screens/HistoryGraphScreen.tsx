import React, { useCallback, useState } from 'react'
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Platform,
} from 'react-native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useFocusEffect } from '@react-navigation/native'
import { RootStackParamList, BMIHistoryEntry, GraphTimeUnit, GraphMetric } from '../types'
import { getBMIHistory, deleteBMIEntry, clearBMIHistory } from '../services/storage'
import { useTheme } from '../context/ThemeContext'
import { Theme } from '../constants/theme'
import { LineChart, DataPoint } from '../components/LineChart'

function confirmWeb(message: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(message))
  }
  return new Promise((resolve) => {
    Alert.alert('Confirm', message, [
      { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Delete', style: 'destructive', onPress: () => resolve(true) },
    ])
  })
}

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'HistoryGraph'> }

const TIME_UNITS: { value: GraphTimeUnit; label: string }[] = [
  { value: 'days', label: 'Days' },
  { value: 'weeks', label: 'Weeks' },
  { value: 'months', label: 'Months' },
  { value: 'years', label: 'Years' },
]

function aggregateData(
  entries: BMIHistoryEntry[],
  unit: GraphTimeUnit,
  metric: GraphMetric,
): { points: DataPoint[]; raw: BMIHistoryEntry[] }[] {
  if (entries.length === 0) return []

  const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp)

  interface Bucket {
    label: string
    values: number[]
    entries: BMIHistoryEntry[]
    key: string
  }

  const buckets = new Map<string, Bucket>()

  for (const entry of sorted) {
    const d = new Date(entry.timestamp)
    let key: string
    let label: string

    switch (unit) {
      case 'days': {
        key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
        label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
        break
      }
      case 'weeks': {
        const startOfYear = new Date(d.getFullYear(), 0, 1)
        const weekNum = Math.ceil(((d.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7)
        key = `${d.getFullYear()}-W${weekNum}`
        label = `W${weekNum}`
        break
      }
      case 'months': {
        key = `${d.getFullYear()}-${d.getMonth()}`
        label = d.toLocaleDateString(undefined, { month: 'short', year: '2-digit' })
        break
      }
      case 'years': {
        key = `${d.getFullYear()}`
        label = `${d.getFullYear()}`
        break
      }
    }

    if (!buckets.has(key)) {
      buckets.set(key, { label, values: [], entries: [], key })
    }
    const bucket = buckets.get(key)!
    bucket.values.push(metric === 'bmi' ? entry.bmi : entry.weightLbs)
    bucket.entries.push(entry)
  }

  const groups: { points: DataPoint[]; raw: BMIHistoryEntry[] }[] = []

  for (const bucket of buckets.values()) {
    const avg = bucket.values.reduce((a, b) => a + b, 0) / bucket.values.length
    const point: DataPoint = {
      label: bucket.label,
      value: Math.round(avg * 10) / 10,
      timestamp: bucket.entries[bucket.entries.length - 1].timestamp,
    }
    groups.push({ points: [point], raw: bucket.entries })
  }

  return groups
}

const evaluationColors: Record<string, string> = {
  underweight: '#58A6FF',
  normal: '#3FB950',
  overweight: '#D29922',
  obese: '#F85149',
}

function getMetricColor(metric: GraphMetric, entry: BMIHistoryEntry): string {
  return metric === 'bmi' ? evaluationColors[entry.evaluation] : '#6B4FBC'
}

export default function HistoryGraphScreen({ navigation }: Props) {
  const { theme } = useTheme()
  const s = styles(theme)
  const [allEntries, setAllEntries] = useState<BMIHistoryEntry[]>([])
  const [metric, setMetric] = useState<GraphMetric>('bmi')
  const [timeUnit, setTimeUnit] = useState<GraphTimeUnit>('days')
  const [loading, setLoading] = useState(true)

  useFocusEffect(useCallback(() => { loadData() }, []))

  async function loadData() {
    setLoading(true)
    const entries = await getBMIHistory()
    setAllEntries(entries)
    setLoading(false)
  }

  const groups = aggregateData(allEntries, timeUnit, metric)
  const chartData = groups.map((g) => g.points[0])

  async function handleDeleteAll() {
    const ok = await confirmWeb(`Delete all ${allEntries.length} BMI and weight records? This cannot be undone.`)
    if (!ok) return
    await clearBMIHistory()
    setAllEntries([])
  }

  async function handleDeleteEntry(timestamp: number) {
    const ok = await confirmWeb('Remove this data point from history?')
    if (!ok) return
    await deleteBMIEntry(timestamp)
    setAllEntries((prev) => prev.filter((e) => e.timestamp !== timestamp))
  }

  function formatDate(ts: number): string {
    return new Date(ts).toLocaleDateString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.backText}>{'< Back'}</Text>
        </TouchableOpacity>
        <Text style={s.heading}>History Graphs</Text>
        <View style={{ width: 50 }} />
      </View>

      <View style={s.metricToggle}>
        <TouchableOpacity
          style={[s.metricOption, metric === 'bmi' && s.metricOptionActive]}
          onPress={() => setMetric('bmi')}
        >
          <Text style={[s.metricLabel, metric === 'bmi' && s.metricLabelActive]}>BMI</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.metricOption, metric === 'weight' && s.metricOptionActive]}
          onPress={() => setMetric('weight')}
        >
          <Text style={[s.metricLabel, metric === 'weight' && s.metricLabelActive]}>Weight (lbs)</Text>
        </TouchableOpacity>
      </View>

      <View style={s.timeUnitRow}>
        {TIME_UNITS.map((u) => (
          <TouchableOpacity
            key={u.value}
            style={[s.timeUnitChip, timeUnit === u.value && s.timeUnitChipActive]}
            onPress={() => setTimeUnit(u.value)}
          >
            <Text style={[s.timeUnitText, timeUnit === u.value && s.timeUnitTextActive]}>
              {u.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={s.center}>
          <Text style={{ color: theme.textSecondary }}>Loading...</Text>
        </View>
      ) : allEntries.length === 0 ? (
        <View style={s.emptySection}>
          <Text style={s.emptyTitle}>No history yet</Text>
          <Text style={s.emptySubtitle}>
            Calculate your BMI from the home screen to start tracking.
          </Text>
          <TouchableOpacity
            style={s.homeButton}
            onPress={() => navigation.navigate('Main', { screen: 'Home' } as never)}
          >
            <Text style={s.homeButtonText}>Go to Home</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.scrollContent}>
          <LineChart
            data={chartData}
            theme={theme}
            height={260}
            lineColor={metric === 'weight' ? '#6B4FBC' : undefined}
          />

          <View style={s.statsRow}>
            <View style={s.statCard}>
              <Text style={s.statValue}>{allEntries.length}</Text>
              <Text style={s.statLabel}>Total Records</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statValue}>
                {metric === 'bmi'
                  ? Math.min(...allEntries.map((e) => e.bmi)).toFixed(1)
                  : Math.min(...allEntries.map((e) => e.weightLbs)).toFixed(0)}
              </Text>
              <Text style={s.statLabel}>Lowest</Text>
            </View>
            <View style={s.statCard}>
              <Text style={s.statValue}>
                {metric === 'bmi'
                  ? Math.max(...allEntries.map((e) => e.bmi)).toFixed(1)
                  : Math.max(...allEntries.map((e) => e.weightLbs)).toFixed(0)}
              </Text>
              <Text style={s.statLabel}>Highest</Text>
            </View>
          </View>

          <Text style={s.sectionTitle}>All Records</Text>

          {allEntries.map((entry, i) => (
            <View key={entry.timestamp} style={s.recordRow}>
              <View
                style={[
                  s.recordDot,
                  { backgroundColor: getMetricColor(metric, entry) },
                ]}
              />
              <View style={s.recordInfo}>
                <Text style={s.recordPrimary}>
                  {metric === 'bmi'
                    ? `BMI ${entry.bmi}`
                    : `${entry.weightLbs} lbs`}
                  {'  '}
                  <Text style={s.recordSecondary}>
                    {metric === 'bmi' ? entry.evaluation : `BMI ${entry.bmi}`}
                  </Text>
                </Text>
                <Text style={s.recordMeta}>
                  {formatDate(entry.timestamp)} — Age {entry.age}, {entry.gender}
                </Text>
              </View>
              {i === 0 && <Text style={s.latestBadge}>Latest</Text>}
              <TouchableOpacity
                style={s.recordDelete}
                onPress={() => handleDeleteEntry(entry.timestamp)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={s.recordDeleteText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}

          <TouchableOpacity style={s.deleteAllButton} onPress={handleDeleteAll}>
            <Text style={s.deleteAllText}>
              Clear All History ({allEntries.length} records)
            </Text>
          </TouchableOpacity>

          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  )
}

const styles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 24, paddingTop: 60,
  },
  backText: { color: t.accent, fontSize: 16 },
  heading: { color: t.text, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  metricToggle: {
    flexDirection: 'row', marginHorizontal: 24, marginBottom: 12,
    backgroundColor: t.surface, borderRadius: 10, borderWidth: 1, borderColor: t.border, overflow: 'hidden',
  },
  metricOption: {
    flex: 1, paddingVertical: 10, alignItems: 'center',
  },
  metricOptionActive: { backgroundColor: t.accent + '22' },
  metricLabel: { color: t.textSecondary, fontSize: 14, fontWeight: '600' },
  metricLabelActive: { color: t.accent, fontWeight: '700' },

  timeUnitRow: {
    flexDirection: 'row', marginHorizontal: 24, marginBottom: 16, gap: 8,
  },
  timeUnitChip: {
    flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8,
    backgroundColor: t.surface, borderWidth: 1, borderColor: t.border,
  },
  timeUnitChipActive: { borderColor: t.accent, backgroundColor: t.selectedBg },
  timeUnitText: { color: t.textSecondary, fontSize: 13, fontWeight: '600' },
  timeUnitTextActive: { color: t.accent },

  scrollContent: { padding: 24, paddingTop: 0, paddingBottom: 40 },
  emptySection: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyTitle: { color: t.text, fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptySubtitle: { color: t.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  homeButton: { backgroundColor: t.success, padding: 14, borderRadius: 8 },
  homeButtonText: { color: t.successText, fontSize: 15, fontWeight: '600' },

  statsRow: { flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 24 },
  statCard: {
    flex: 1, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border,
    borderRadius: 10, padding: 14, alignItems: 'center',
  },
  statValue: { color: t.accent, fontSize: 22, fontWeight: '800' },
  statLabel: { color: t.textSecondary, fontSize: 11, marginTop: 4 },

  sectionTitle: { fontSize: 16, fontWeight: '700', color: t.text, marginBottom: 12 },

  recordRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: t.border,
  },
  recordDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  recordInfo: { flex: 1 },
  recordPrimary: { color: t.text, fontSize: 14, fontWeight: '600' },
  recordSecondary: { color: t.textSecondary, fontSize: 13, fontWeight: '400' },
  recordMeta: { color: t.textMuted, fontSize: 12, marginTop: 2 },
  latestBadge: {
    backgroundColor: t.accent + '22', color: t.accent, fontSize: 11, fontWeight: '700',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, overflow: 'hidden',
  },
  recordDelete: {
    marginLeft: 8, width: 28, height: 28, borderRadius: 14,
    backgroundColor: t.danger + '18', justifyContent: 'center', alignItems: 'center',
  },
  recordDeleteText: { color: t.danger, fontSize: 12, fontWeight: '700' },

  deleteAllButton: {
    marginTop: 24, padding: 14, alignItems: 'center', borderRadius: 8,
    borderWidth: 1, borderColor: t.danger + '40', backgroundColor: t.danger + '12',
  },
  deleteAllText: { color: t.danger, fontSize: 14, fontWeight: '600' },
})
