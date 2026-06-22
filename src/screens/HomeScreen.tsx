import React, { useState, useCallback } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  Modal,
} from 'react-native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useFocusEffect } from '@react-navigation/native'
import {
  RootStackParamList, Gender, UnitSystem, BMIHistoryEntry, Badge,
  WorkoutPlan, TrainingSplit, WorkoutLog,
} from '../types'
import { useTheme } from '../context/ThemeContext'
import { Theme } from '../constants/theme'
import { CM_PER_INCH, LBS_PER_KG, TRAINING_SPLITS } from '../constants'
import { calculateBMI } from '../services/bmi'
import {
  saveBMIEntry, getBMIHistory, getWorkoutHistory,
  saveWorkoutPlan, getWorkoutLogs,
  updateLastActivity, isSessionExpired, deleteUserProfile,
  getUserProfile,
} from '../services/storage'
import { getBadges, checkAndUnlockBadges } from '../services/badges'
import { getReminderConfig, scheduleDailyReminder, cancelDailyReminder, ReminderConfig } from '../services/notifications'
import { generateWorkoutPlan } from '../services/workoutGen'

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Home'> }

const genderOptions: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
]

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

function formatDate(ts: number): string {
  const d = new Date(ts)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export default function HomeScreen({ navigation }: Props) {
  const { theme, mode, toggleTheme } = useTheme()
  const s = styles(theme)

  const [age, setAge] = useState('')
  const [gender, setGender] = useState<Gender | null>(null)
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('imperial')
  const [feet, setFeet] = useState('')
  const [inches, setInches] = useState('')
  const [weight, setWeight] = useState('')
  const [error, setError] = useState('')
  const [userName, setUserName] = useState('')

  const [streak, setStreak] = useState(0)
  const [totalChecks, setTotalChecks] = useState(0)
  const [badges, setBadges] = useState<Badge[]>([])
  const [latestPlan, setLatestPlan] = useState<WorkoutPlan | null>(null)
  const [recentLogs, setRecentLogs] = useState<WorkoutLog[]>([])
  const [reminder, setReminder] = useState<ReminderConfig>({ hour: 8, minute: 0, enabled: false })
  const [settingReminder, setSettingReminder] = useState(false)

  const [bmiExpanded, setBmiExpanded] = useState(false)
  const [splitModalVisible, setSplitModalVisible] = useState(false)

  useFocusEffect(useCallback(() => {
    (async () => {
      if (await isSessionExpired()) {
        await deleteUserProfile()
        navigation.reset({ index: 0, routes: [{ name: 'Profile' }] })
        return
      }
      const userProfile = await getUserProfile()
      if (!userProfile) {
        navigation.reset({ index: 0, routes: [{ name: 'Profile' }] })
        return
      }
      setUserName(userProfile.name.split(' ')[0])
      await updateLastActivity()

      const [entries, history, logs] = await Promise.all([
        getBMIHistory(), getWorkoutHistory(), getWorkoutLogs(),
      ])
      const s = computeStreak(entries)
      setStreak(s)
      setTotalChecks(entries.length)
      await checkAndUnlockBadges(entries, s)
      setBadges(await getBadges())
      setReminder(await getReminderConfig())
      setLatestPlan(history.find((p) => !!p.structuredPlan) ?? null)
      setRecentLogs(logs.slice(0, 3))
    })()
  }, []))

  async function handleCalculate() {
    setError('')
    const a = parseInt(age, 10)
    const g = gender

    if (!a || a < 1 || a > 120) { setError('Please enter a valid age (1-120)'); return }
    if (!g) { setError('Please select your gender'); return }

    let f: number, i: number, w: number

    if (unitSystem === 'metric') {
      const cm = parseInt(feet, 10)
      const kg = parseFloat(weight)
      if (!cm || cm < 30 || cm > 250) { setError('Please enter a valid height in cm (30-250)'); return }
      if (!kg || kg < 9 || kg > 450) { setError('Please enter a valid weight in kg (9-450)'); return }
      const totalInches = cm / CM_PER_INCH
      f = Math.floor(totalInches / 12)
      i = Math.round(totalInches - f * 12)
      w = kg * LBS_PER_KG
    } else {
      f = parseInt(feet, 10)
      i = parseInt(inches, 10) || 0
      w = parseFloat(weight)
      if (!f || f < 1 || f > 8) { setError('Please enter a valid height in feet (1-8)'); return }
      if (i < 0 || i > 11) { setError('Inches must be between 0 and 11'); return }
      if (!w || w < 20 || w > 1000) { setError('Please enter a valid weight in lbs (20-1000)'); return }
    }

    const userInput = { age: a, gender: g, unitSystem, heightFeet: f, heightInches: i, weightLbs: Math.round(w) }
    const { bmi, evaluation } = calculateBMI(userInput.weightLbs, userInput.heightFeet, userInput.heightInches)
    await saveBMIEntry({ bmi, evaluation, timestamp: Date.now(), age: a, gender: g })

    const entries = await getBMIHistory()
    const s = computeStreak(entries)
    setStreak(s)
    setTotalChecks(entries.length)
    const newBadges = await checkAndUnlockBadges(entries, s)
    setBadges(await getBadges())
    if (newBadges.length > 0) {
      Alert.alert(
        'Badge Unlocked!',
        newBadges.map((b) => `${b.icon}  ${b.label}\n${b.description}`).join('\n\n'),
      )
    }

    navigation.navigate('Result', { userInput })
  }

  async function handleQuickWorkout() {
    const entries = await getBMIHistory()
    const latest = entries[0]
    const ageVal = latest?.age ?? 30
    const genderVal = latest?.gender ?? 'male' as Gender
    const bmiVal = latest?.bmi ?? 22
    const evalVal = latest?.evaluation ?? 'normal'

    const plan = generateWorkoutPlan({
      age: ageVal,
      gender: genderVal,
      bmi: bmiVal,
      evaluation: evalVal,
      lifestyle: 'moderate',
      exerciseLevel: 'medium',
      split: 'full_body',
    })

    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
    const workoutPlan: WorkoutPlan = {
      id,
      timestamp: Date.now(),
      userInput: { age: ageVal, gender: genderVal, unitSystem: 'imperial', heightFeet: 5, heightInches: 9, weightLbs: 160 },
      bmiResult: { bmi: bmiVal, evaluation: evalVal as any },
      answers: { lifestyle: 'moderate', exerciseLevel: 'medium', trainingSplit: 'full_body' },
      plan: plan.name,
      structuredPlan: plan,
    }
    await saveWorkoutPlan(workoutPlan)
    setLatestPlan(workoutPlan)

    navigation.navigate('WorkoutLog', {
      planId: id,
      day: plan.days[0].day,
      focus: plan.days[0].focus,
      exercises: plan.days[0].exercises,
    })
  }

  async function handleStartSplit(split: TrainingSplit) {
    setSplitModalVisible(false)
    const entries = await getBMIHistory()
    const latest = entries[0]
    const ageVal = latest?.age ?? 30
    const genderVal = latest?.gender ?? 'male' as Gender
    const bmiVal = latest?.bmi ?? 22
    const evalVal = latest?.evaluation ?? 'normal'

    const plan = generateWorkoutPlan({
      age: ageVal,
      gender: genderVal,
      bmi: bmiVal,
      evaluation: evalVal,
      lifestyle: 'moderate',
      exerciseLevel: 'medium',
      split,
    })

    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
    const workoutPlan: WorkoutPlan = {
      id,
      timestamp: Date.now(),
      userInput: { age: ageVal, gender: genderVal, unitSystem: 'imperial', heightFeet: 5, heightInches: 9, weightLbs: 160 },
      bmiResult: { bmi: bmiVal, evaluation: evalVal as any },
      answers: { lifestyle: 'moderate', exerciseLevel: 'medium', trainingSplit: split },
      plan: plan.name,
      structuredPlan: plan,
    }
    await saveWorkoutPlan(workoutPlan)
    setLatestPlan(workoutPlan)

    navigation.navigate('WorkoutLog', {
      planId: id,
      day: plan.days[0].day,
      focus: plan.days[0].focus,
      exercises: plan.days[0].exercises,
    })
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Altianly</Text>
            {userName ? <Text style={s.greeting}>Welcome back, {userName}!</Text> : null}
          </View>
          <View style={s.headerButtons}>
            <TouchableOpacity
              onPress={toggleTheme}
              accessibilityRole="button"
              accessibilityLabel={`Switch to ${mode === 'dark' ? 'cream' : 'dark'} theme`}
            >
              <Text style={s.themeToggle}>{mode === 'dark' ? '☀️' : '🌙'}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.settingsButton}
              onPress={() => navigation.navigate('Profile')}
              accessibilityRole="button"
              accessibilityLabel="Open profile"
            >
              <Text style={s.settingsText}>Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={s.settingsButton}
              onPress={() => navigation.navigate('Settings')}
              accessibilityRole="button"
              accessibilityLabel="Open settings"
            >
              <Text style={s.settingsText}>Settings</Text>
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          style={s.historyLink}
          onPress={() => navigation.navigate('History')}
          accessibilityRole="link"
          accessibilityLabel="View saved workout plans"
        >
          <Text style={s.historyLinkText}>View Saved Workouts</Text>
        </TouchableOpacity>

        <View style={s.streakBar} accessibilityRole="text" accessibilityLabel={`${streak} day streak, ${totalChecks} total checks`}>
          <View style={s.streakItem}>
            <Text style={s.streakValue}>{streak}</Text>
            <Text style={s.streakLabel}>Day Streak</Text>
          </View>
          <View style={s.streakDivider} />
          <View style={s.streakItem}>
            <Text style={s.streakValue}>{totalChecks}</Text>
            <Text style={s.streakLabel}>Total Checks</Text>
          </View>
        </View>

        {badges.length > 0 && (
          <View style={s.badgesSection}>
            <Text style={s.badgesTitle}>Badges ({badges.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.badgesRow}>
              {badges.map((badge) => (
                <View key={badge.id} style={s.badgeItem} accessibilityRole="text" accessibilityLabel={`${badge.label} badge: ${badge.description}`}>
                  <Text style={s.badgeIcon}>{badge.icon}</Text>
                  <Text style={s.badgeLabel}>{badge.label}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <Text style={s.sectionLabel}>Quick Start</Text>
        <View style={s.quickActionsRow}>
          <TouchableOpacity
            style={s.quickActionPrimary}
            onPress={handleQuickWorkout}
            accessibilityRole="button"
            accessibilityLabel="Start a quick workout now"
          >
            <Text style={s.quickActionIcon}>⚡</Text>
            <Text style={s.quickActionTitle}>Quick Workout</Text>
            <Text style={s.quickActionDesc}>Full body, no setup needed</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={s.quickActionSecondary}
            onPress={() => setSplitModalVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Choose a training split"
          >
            <Text style={s.quickActionIcon}>🏋️</Text>
            <Text style={s.quickActionTitle}>Start a Split</Text>
            <Text style={s.quickActionDesc}>PPL, Upper/Lower, more</Text>
          </TouchableOpacity>
        </View>

        {latestPlan?.structuredPlan && (
          <View style={s.quickStartCard}>
            <Text style={s.quickStartLabel}>Resume Latest Plan</Text>
            <Text style={s.quickStartName}>{latestPlan.structuredPlan.name}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.quickStartDays}>
              {latestPlan.structuredPlan.days.map((day) => (
                <TouchableOpacity
                  key={day.day}
                  style={s.dayChip}
                  onPress={() => navigation.navigate('WorkoutLog', {
                    planId: latestPlan.id,
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
          </View>
        )}

        {recentLogs.length > 0 && (
          <View style={s.recentSection}>
            <Text style={s.sectionLabel}>Recent Activity</Text>
            {recentLogs.map((log) => (
              <TouchableOpacity
                key={log.id}
                style={s.recentCard}
                onPress={() => navigation.navigate('PlanLogs', { planId: log.planId })}
                accessibilityRole="button"
                accessibilityLabel={`Workout on ${formatDate(log.timestamp)}: ${log.focus}`}
              >
                <View style={{ flex: 1 }}>
                  <Text style={s.recentFocus}>{log.focus}</Text>
                  <Text style={s.recentMeta}>{formatDate(log.timestamp)} · {log.entries.length} exercises</Text>
                </View>
                <Text style={s.recentArrow}>›</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={s.sectionLabel}>Health Snapshot</Text>
        <TouchableOpacity
          style={s.bmiHeader}
          onPress={() => setBmiExpanded(!bmiExpanded)}
          accessibilityRole="button"
          accessibilityLabel={bmiExpanded ? 'Collapse BMI calculator' : 'Expand BMI calculator'}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={s.bmiHeaderIcon}>📊</Text>
            <View>
              <Text style={s.bmiHeaderTitle}>BMI Check</Text>
              <Text style={s.bmiHeaderDesc}>Calculate your body mass index</Text>
            </View>
          </View>
          <Text style={s.bmiChevron}>{bmiExpanded ? '▲' : '▼'}</Text>
        </TouchableOpacity>

        {bmiExpanded && (
          <View style={s.bmiForm}>
            <View style={s.unitToggle}>
              <TouchableOpacity
                style={[s.unitButton, unitSystem === 'imperial' && s.unitButtonActive]}
                onPress={() => setUnitSystem('imperial')}
                accessibilityRole="radio"
                accessibilityState={{ selected: unitSystem === 'imperial' }}
                accessibilityLabel="Switch to imperial units"
              >
                <Text style={[s.unitButtonText, unitSystem === 'imperial' && s.unitButtonTextActive]}>Imperial</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.unitButton, unitSystem === 'metric' && s.unitButtonActive]}
                onPress={() => setUnitSystem('metric')}
                accessibilityRole="radio"
                accessibilityState={{ selected: unitSystem === 'metric' }}
                accessibilityLabel="Switch to metric units"
              >
                <Text style={[s.unitButtonText, unitSystem === 'metric' && s.unitButtonTextActive]}>Metric</Text>
              </TouchableOpacity>
            </View>

            <View style={s.inputGroup}>
              <Text style={s.label}>Gender</Text>
              <View style={s.genderRow}>
                {genderOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[s.genderCard, gender === opt.value && s.genderCardSelected]}
                    onPress={() => setGender(opt.value)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: gender === opt.value }}
                    accessibilityLabel={`Select ${opt.label} as your gender`}
                  >
                    <Text style={[s.genderLabel, gender === opt.value && s.genderLabelSelected]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={s.inputGroup}>
              <Text style={s.label}>Age</Text>
              <TextInput
                style={s.input}
                value={age}
                onChangeText={setAge}
                keyboardType="number-pad"
                placeholder="Years"
                maxLength={3}
                placeholderTextColor={theme.textMuted}
                accessibilityLabel="Enter your age in years"
              />
            </View>

            <View style={s.inputGroup}>
              <Text style={s.label}>Height</Text>
              {unitSystem === 'imperial' ? (
                <View style={s.row}>
                  <View style={s.halfInput}>
                    <TextInput
                      style={s.input}
                      value={feet}
                      onChangeText={setFeet}
                      keyboardType="number-pad"
                      placeholder="Feet"
                      maxLength={1}
                      placeholderTextColor={theme.textMuted}
                      accessibilityLabel="Enter your height in feet"
                    />
                  </View>
                  <View style={s.halfInput}>
                    <TextInput
                      style={s.input}
                      value={inches}
                      onChangeText={setInches}
                      keyboardType="number-pad"
                      placeholder="Inches"
                      maxLength={2}
                      placeholderTextColor={theme.textMuted}
                      accessibilityLabel="Enter your height in inches"
                    />
                  </View>
                </View>
              ) : (
                <TextInput
                  style={s.input}
                  value={feet}
                  onChangeText={setFeet}
                  keyboardType="number-pad"
                  placeholder="Centimeters (cm)"
                  maxLength={3}
                  placeholderTextColor={theme.textMuted}
                  accessibilityLabel="Enter your height in centimeters"
                />
              )}
            </View>

            <View style={s.inputGroup}>
              <Text style={s.label}>Weight</Text>
              <TextInput
                style={s.input}
                value={weight}
                onChangeText={setWeight}
                keyboardType="decimal-pad"
                placeholder={unitSystem === 'imperial' ? 'Pounds (lbs)' : 'Kilograms (kg)'}
                placeholderTextColor={theme.textMuted}
                accessibilityLabel={`Enter your weight in ${unitSystem === 'imperial' ? 'pounds' : 'kilograms'}`}
              />
            </View>

            {error ? <Text style={s.error}>{error}</Text> : null}

            <TouchableOpacity
              style={s.button}
              onPress={handleCalculate}
              accessibilityRole="button"
              accessibilityLabel="Calculate your BMI"
            >
              <Text style={s.buttonText}>Calculate BMI</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={s.reminderSection}>
          <Text style={s.reminderTitle}>
            {reminder.enabled ? `Reminder set for ${reminder.hour % 12 || 12}:${reminder.minute.toString().padStart(2, '0')} ${reminder.hour < 12 ? 'AM' : 'PM'}` : 'Daily Reminder'}
          </Text>
          {reminder.enabled ? (
            <TouchableOpacity
              style={s.reminderCancelButton}
              onPress={async () => {
                await cancelDailyReminder()
                setReminder({ hour: 8, minute: 0, enabled: false })
              }}
              accessibilityRole="button"
              accessibilityLabel="Cancel daily reminder"
            >
              <Text style={s.reminderCancelText}>Cancel Reminder</Text>
            </TouchableOpacity>
          ) : (
            <View style={s.reminderPresets}>
              {[
                { label: '8 AM', hour: 8, minute: 0 },
                { label: '12 PM', hour: 12, minute: 0 },
                { label: '6 PM', hour: 18, minute: 0 },
                { label: '9 PM', hour: 21, minute: 0 },
              ].map((preset) => (
                <TouchableOpacity
                  key={preset.label}
                  style={[s.reminderPresetButton, settingReminder && s.reminderPresetDisabled]}
                  disabled={settingReminder}
                  onPress={async () => {
                    setSettingReminder(true)
                    const ok = await scheduleDailyReminder(preset.hour, preset.minute)
                    setSettingReminder(false)
                    if (ok) {
                      setReminder({ hour: preset.hour, minute: preset.minute, enabled: true })
                    } else {
                      Alert.alert('Permission Denied', 'Please enable notifications in your device settings to receive reminders.')
                    }
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Set daily reminder for ${preset.label}`}
                >
                  <Text style={s.reminderPresetText}>{preset.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={splitModalVisible} transparent animationType="fade" onRequestClose={() => setSplitModalVisible(false)}>
        <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={() => setSplitModalVisible(false)}>
          <View style={s.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={s.modalTitle}>Choose Your Split</Text>
            {TRAINING_SPLITS.map((split) => (
              <TouchableOpacity
                key={split.value}
                style={s.splitCard}
                onPress={() => handleStartSplit(split.value)}
                accessibilityRole="button"
                accessibilityLabel={`Start ${split.label} split: ${split.desc}`}
              >
                <Text style={s.splitName}>{split.label}</Text>
                <Text style={s.splitDesc}>{split.desc}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={s.modalCancel}
              onPress={() => setSplitModalVisible(false)}
              accessibilityRole="button"
              accessibilityLabel="Cancel split selection"
            >
              <Text style={s.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </KeyboardAvoidingView>
  )
}

const styles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  content: { padding: 24, paddingTop: 60 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 8 },
  title: { fontSize: 32, fontWeight: '800', color: t.accent },
  greeting: { color: t.textSecondary, fontSize: 14, marginTop: 2 },
  headerButtons: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  themeToggle: { fontSize: 20, padding: 4 },
  settingsButton: { padding: 8 },
  settingsText: { color: t.accent, fontSize: 14, fontWeight: '600' },
  historyLink: { alignSelf: 'center', marginBottom: 16 },
  historyLinkText: { color: t.textSecondary, fontSize: 14, textDecorationLine: 'underline' },
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: t.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 20,
  },
  streakBar: {
    flexDirection: 'row',
    backgroundColor: t.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: t.border,
    paddingVertical: 14,
  },
  streakItem: { flex: 1, alignItems: 'center' },
  streakValue: { fontSize: 22, fontWeight: '800', color: t.accent },
  streakLabel: { fontSize: 12, color: t.textSecondary, marginTop: 2 },
  streakDivider: { width: 1, backgroundColor: t.border },
  badgesSection: { marginTop: 12 },
  badgesTitle: { color: t.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 8 },
  badgesRow: { gap: 10 },
  badgeItem: {
    alignItems: 'center',
    backgroundColor: t.surface,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 80,
  },
  badgeIcon: { fontSize: 24, marginBottom: 4 },
  badgeLabel: { color: t.text, fontSize: 11, fontWeight: '600', textAlign: 'center' },

  quickActionsRow: { flexDirection: 'row', gap: 10 },
  quickActionPrimary: {
    flex: 1.5,
    backgroundColor: t.success,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  quickActionSecondary: {
    flex: 1,
    backgroundColor: t.surface,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 12,
    padding: 18,
    alignItems: 'center',
  },
  quickActionIcon: { fontSize: 24, marginBottom: 6 },
  quickActionTitle: { fontSize: 15, fontWeight: '700', color: t.text, marginBottom: 2 },
  quickActionDesc: { fontSize: 11, color: t.textSecondary, textAlign: 'center' },

  quickStartCard: {
    backgroundColor: t.surface,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 10,
    padding: 16,
    marginTop: 16,
  },
  quickStartLabel: { color: t.textSecondary, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  quickStartName: { color: t.text, fontSize: 15, fontWeight: '700', marginBottom: 12 },
  quickStartDays: { gap: 8 },
  dayChip: {
    backgroundColor: t.accent + '18',
    borderWidth: 1,
    borderColor: t.accent + '40',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 88,
    alignItems: 'center',
  },
  dayChipNumber: { color: t.accent, fontSize: 12, fontWeight: '700' },
  dayChipFocus: { color: t.text, fontSize: 11, marginTop: 3, textAlign: 'center' },

  recentSection: { marginTop: 4 },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.surface,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  recentFocus: { fontSize: 14, fontWeight: '600', color: t.text },
  recentMeta: { fontSize: 12, color: t.textSecondary, marginTop: 2 },
  recentArrow: { fontSize: 20, color: t.textMuted, marginLeft: 8 },

  bmiHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: t.surface,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 10,
    padding: 16,
  },
  bmiHeaderIcon: { fontSize: 22 },
  bmiHeaderTitle: { fontSize: 15, fontWeight: '700', color: t.text },
  bmiHeaderDesc: { fontSize: 12, color: t.textSecondary, marginTop: 1 },
  bmiChevron: { fontSize: 12, color: t.textMuted },
  bmiForm: {
    backgroundColor: t.surface,
    borderWidth: 1,
    borderColor: t.border,
    borderTopWidth: 0,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    padding: 16,
    paddingTop: 20,
  },
  unitToggle: { flexDirection: 'row', backgroundColor: t.bg, borderRadius: 8, borderWidth: 1, borderColor: t.border, marginBottom: 20 },
  unitButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 7 },
  unitButtonActive: { backgroundColor: t.accent },
  unitButtonText: { fontSize: 14, fontWeight: '600', color: t.textSecondary },
  unitButtonTextActive: { color: '#FFF' },
  inputGroup: { marginBottom: 20 },
  genderRow: { flexDirection: 'row', gap: 10 },
  genderCard: {
    flex: 1,
    backgroundColor: t.inputBg,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  genderCardSelected: { borderColor: t.accent, backgroundColor: t.isDark ? '#1C2533' : '#F3EDFF' },
  genderLabel: { color: t.textSecondary, fontSize: 14, fontWeight: '600' },
  genderLabelSelected: { color: t.accent },
  label: { color: t.text, fontSize: 14, fontWeight: '600', marginBottom: 6 },
  input: {
    backgroundColor: t.inputBg,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 8,
    padding: 14,
    color: t.text,
    fontSize: 16,
  },
  row: { flexDirection: 'row', gap: 12 },
  halfInput: { flex: 1 },
  error: { color: t.danger, textAlign: 'center', marginBottom: 16 },
  button: { backgroundColor: t.success, padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  buttonText: { color: t.successText, fontSize: 16, fontWeight: '700' },

  reminderSection: {
    backgroundColor: t.surface,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 10,
    padding: 16,
    marginTop: 20,
    marginBottom: 40,
  },
  reminderTitle: { color: t.text, fontSize: 14, fontWeight: '700', marginBottom: 10 },
  reminderPresets: { flexDirection: 'row', gap: 8 },
  reminderPresetButton: {
    flex: 1,
    backgroundColor: t.accent + '22',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  reminderPresetDisabled: { opacity: 0.5 },
  reminderPresetText: { color: t.accent, fontSize: 13, fontWeight: '600' },
  reminderCancelButton: {
    backgroundColor: t.danger + '22',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  reminderCancelText: { color: t.danger, fontSize: 13, fontWeight: '600' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: t.surface,
    borderRadius: 14,
    padding: 24,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: t.text, marginBottom: 16, textAlign: 'center' },
  splitCard: {
    backgroundColor: t.bg,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 10,
    padding: 16,
    marginBottom: 10,
  },
  splitName: { fontSize: 15, fontWeight: '700', color: t.text, marginBottom: 4 },
  splitDesc: { fontSize: 12, color: t.textSecondary, lineHeight: 18 },
  modalCancel: { padding: 14, alignItems: 'center', marginTop: 4 },
  modalCancelText: { color: t.textMuted, fontSize: 15, fontWeight: '600' },
})
