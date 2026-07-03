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
import { Ionicons } from '@expo/vector-icons'
import ProgressRing from '../components/ProgressRing'
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
  getUserProfile, isGuestMode,
} from '../services/storage'
import { getBadges, checkAndUnlockBadges } from '../services/badges'
import { generateWorkoutPlan } from '../services/workoutGen'
import { getAllHabits, getWeekEntries } from '../services/habits'
import type { Habit, HabitEntry as HabitEntryType } from '../types'
import { getMealsForDate, getDailyTotals, DEFAULT_RDI } from '../services/nutrition'

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

function greetingForNow(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function todayLabel(): string {
  return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

// Which days of the current week (Mon..Sun) have at least one workout log
function computeWeekDays(logs: WorkoutLog[]): boolean[] {
  const now = new Date()
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7))
  const days = new Array(7).fill(false)
  for (const log of logs) {
    const d = new Date(log.timestamp)
    const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate())
    const diff = Math.round((dayStart.getTime() - monday.getTime()) / 86400000)
    if (diff >= 0 && diff < 7) days[diff] = true
  }
  return days
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
  const [weekDays, setWeekDays] = useState<boolean[]>(new Array(7).fill(false))
  const [badges, setBadges] = useState<Badge[]>([])
  const [latestPlan, setLatestPlan] = useState<WorkoutPlan | null>(null)
  const [recentLogs, setRecentLogs] = useState<WorkoutLog[]>([])
  const [nutritionTotals, setNutritionTotals] = useState({ calories: 0, protein: 0, carbs: 0, fat: 0 })
  const [habits, setHabits] = useState<Habit[]>([])
  const [habitWeekEntries, setHabitWeekEntries] = useState<Record<string, (HabitEntryType | null)[]>>({})
  const [bmiExpanded, setBmiExpanded] = useState(false)
  const [splitModalVisible, setSplitModalVisible] = useState(false)

  useFocusEffect(useCallback(() => {
    (async () => {
      const userProfile = await getUserProfile()
      const rootNav = navigation.getParent() ?? navigation
      if (userProfile && await isSessionExpired()) {
        await deleteUserProfile()
        rootNav.reset({ index: 0, routes: [{ name: 'Auth' }] })
        return
      }
      if (!userProfile && !(await isGuestMode())) {
        rootNav.reset({ index: 0, routes: [{ name: 'Auth' }] })
        return
      }
      setUserName(userProfile ? userProfile.name.split(' ')[0] : '')
      await updateLastActivity()

      const [entries, history, logs] = await Promise.all([
        getBMIHistory(), getWorkoutHistory(), getWorkoutLogs(),
      ])
      const s = computeStreak(entries)
      setStreak(s)
      setWeekDays(computeWeekDays(logs))
      try { await checkAndUnlockBadges(entries, s) } catch {}
      try { setBadges(await getBadges()) } catch {}
      setLatestPlan(history.find((p) => !!p.structuredPlan) ?? null)
      setRecentLogs(logs.slice(0, 3))

      try {
        const loadedHabits = await getAllHabits()
        setHabits(loadedHabits)
        const weekMap: Record<string, (HabitEntryType | null)[]> = {}
        for (const h of loadedHabits) {
          weekMap[h.id] = await getWeekEntries(h.id)
        }
        setHabitWeekEntries(weekMap)
      } catch {}
    })()
  }, []))

  useFocusEffect(useCallback(() => {
    (async () => {
      const d = new Date()
      const ls = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const todayMeals = await getMealsForDate(ls)
      const totals = getDailyTotals(todayMeals)
      setNutritionTotals({ calories: totals.calories, protein: totals.protein, carbs: totals.carbs, fat: totals.fat })
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
    await saveBMIEntry({ bmi, weightLbs: Math.round(w), evaluation, timestamp: Date.now(), age: a, gender: g })

    const entries = await getBMIHistory()
    const s = computeStreak(entries)
    setStreak(s)
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

    const plan = generateWorkoutPlan({
      age: ageVal,
      lifestyle: 'moderate',
      exerciseLevel: 'medium',
      split: 'full_body',
    })

    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
    const workoutPlan: WorkoutPlan = {
      id,
      timestamp: Date.now(),
      userInput: { age: ageVal, gender: 'male', unitSystem: 'imperial', heightFeet: 5, heightInches: 9, weightLbs: 160 },
      bmiResult: { bmi: 22, evaluation: 'normal' },
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

    const plan = generateWorkoutPlan({
      age: ageVal,
      lifestyle: 'moderate',
      exerciseLevel: 'medium',
      split,
    })

    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
    const workoutPlan: WorkoutPlan = {
      id,
      timestamp: Date.now(),
      userInput: { age: ageVal, gender: 'male', unitSystem: 'imperial', heightFeet: 5, heightInches: 9, weightLbs: 160 },
      bmiResult: { bmi: 22, evaluation: 'normal' },
      answers: { lifestyle: 'moderate', exerciseLevel: 'medium', trainingSplit: split, workoutChoice: 'strength' },
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
            <Text style={s.greetingTitle}>{greetingForNow()}{userName ? `, ${userName}` : ''}</Text>
            <Text style={s.dateSub}>{todayLabel()}</Text>
          </View>
          <View style={s.headerButtons}>
            <TouchableOpacity
              style={s.iconButton}
              onPress={toggleTheme}
              accessibilityRole="button"
              accessibilityLabel={`Switch to ${mode === 'dark' ? 'cream' : 'dark'} theme`}
            >
              <Ionicons name={mode === 'dark' ? 'sunny-outline' : 'moon-outline'} size={22} color={theme.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={s.iconButton}
              onPress={() => navigation.navigate('Settings')}
              accessibilityRole="button"
              accessibilityLabel="Open settings"
            >
              <Ionicons name="settings-outline" size={22} color={theme.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Today — hero nutrition card */}
        <TouchableOpacity
          style={s.todayCard}
          onPress={() => navigation.navigate('Nutrition')}
          accessibilityRole="button"
          accessibilityLabel={`Today's nutrition: ${nutritionTotals.calories} of ${DEFAULT_RDI.calories} calories. Tap to open nutrition.`}
        >
          <Text style={s.cardLabel}>Today</Text>
          <View style={s.todayRow}>
            <ProgressRing
              size={128}
              strokeWidth={11}
              progress={nutritionTotals.calories / DEFAULT_RDI.calories}
              color={theme.accent}
              trackColor={theme.border}
            >
              <Text style={s.ringValue}>{nutritionTotals.calories}</Text>
              <Text style={s.ringUnit}>/ {DEFAULT_RDI.calories} kcal</Text>
            </ProgressRing>
            <View style={s.macroCol}>
              {[
                { label: 'Protein', value: nutritionTotals.protein, target: DEFAULT_RDI.protein, color: theme.isDark ? '#34D399' : '#10B981' },
                { label: 'Carbs', value: nutritionTotals.carbs, target: DEFAULT_RDI.carbs, color: theme.isDark ? '#FBBF24' : '#F59E0B' },
                { label: 'Fat', value: nutritionTotals.fat, target: DEFAULT_RDI.fat, color: theme.isDark ? '#60A5FA' : '#3B82F6' },
              ].map((m) => (
                <View key={m.label} style={s.macroRow}>
                  <View style={[s.macroDot, { backgroundColor: m.color }]} />
                  <Text style={s.macroName}>{m.label}</Text>
                  <Text style={s.macroValue}>{m.value}g</Text>
                  <Text style={s.macroTarget}>/ {m.target}g</Text>
                </View>
              ))}
            </View>
          </View>
        </TouchableOpacity>

        {/* This Week */}
        <View style={s.weekCard}>
          <View style={s.weekHeader}>
            <Text style={s.cardLabel}>This Week</Text>
            <Text style={s.weekSummary}>
              {weekDays.filter(Boolean).length} workout{weekDays.filter(Boolean).length === 1 ? '' : 's'}
              {streak > 0 ? `  ·  🔥 ${streak}-day streak` : ''}
            </Text>
          </View>
          <View style={s.weekDotsRow}>
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, i) => {
              const isToday = i === (new Date().getDay() + 6) % 7
              return (
                <View key={i} style={s.weekDayCol}>
                  <View style={[s.weekDot, weekDays[i] && s.weekDotDone, isToday && s.weekDotToday]} />
                  <Text style={[s.weekDayLabel, isToday && s.weekDayLabelToday]}>{label}</Text>
                </View>
              )
            })}
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

        {habits.length > 0 && (
          <>
            <View style={s.sectionHeaderRow}>
              <Text style={s.sectionLabel}>Habits This Week</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Habits')}>
                <Text style={s.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            <View style={s.habitWeekCard}>
              <View style={s.habitWeekHeader}>
                {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((label) => (
                  <View key={label} style={s.habitWeekDayCol}>
                    <Text style={s.habitWeekDayLabel}>{label}</Text>
                  </View>
                ))}
              </View>
              {habits.slice(0, 4).map((habit) => {
                const entries = habitWeekEntries[habit.id] || []
                return (
                  <View key={habit.id} style={s.habitWeekRow}>
                    <View style={s.habitWeekNameCol}>
                      <Text style={s.habitWeekName} numberOfLines={1}>{habit.name}</Text>
                    </View>
                    {entries.map((entry, i) => {
                      const done = !!(entry && !entry.skipped && (habit.type === 'yesno' ? entry.value === 'true' : parseFloat(entry.value) > 0))
                      return (
                        <View key={i} style={[s.habitWeekCell, done && s.habitWeekCellDone]} />
                      )
                    })}
                  </View>
                )
              })}
              {habits.length > 4 && (
                <TouchableOpacity style={s.habitWeekMore} onPress={() => navigation.navigate('Habits')}>
                  <Text style={s.habitWeekMoreText}>+{habits.length - 4} more habits</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
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
  content: { padding: 24, paddingTop: 60, paddingBottom: 32 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  greetingTitle: { fontSize: 24, fontWeight: '800', color: t.text, letterSpacing: -0.3 },
  dateSub: { color: t.textSecondary, fontSize: 13, marginTop: 3 },
  headerButtons: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  iconButton: { padding: 8 },
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: t.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10, marginTop: 20,
  },
  cardLabel: {
    fontSize: 12, fontWeight: '700', color: t.textSecondary,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },

  todayCard: {
    backgroundColor: t.surface,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 16,
    padding: 18,
    marginBottom: 12,
  },
  todayRow: { flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 14 },
  ringValue: { fontSize: 28, fontWeight: '800', color: t.text, letterSpacing: -0.5 },
  ringUnit: { fontSize: 11, color: t.textMuted, marginTop: 2 },
  macroCol: { flex: 1, gap: 12 },
  macroRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  macroDot: { width: 8, height: 8, borderRadius: 4 },
  macroName: { flex: 1, color: t.textSecondary, fontSize: 13, fontWeight: '600' },
  macroValue: { color: t.text, fontSize: 15, fontWeight: '800' },
  macroTarget: { color: t.textMuted, fontSize: 11 },

  weekCard: {
    backgroundColor: t.surface,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 16,
    padding: 18,
  },
  weekHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  weekSummary: { color: t.textSecondary, fontSize: 12, fontWeight: '600' },
  weekDotsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  weekDayCol: { alignItems: 'center', gap: 6, flex: 1 },
  weekDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: t.border },
  weekDotDone: { backgroundColor: t.success },
  weekDotToday: { borderWidth: 2, borderColor: t.accent },
  weekDayLabel: { fontSize: 10, fontWeight: '600', color: t.textMuted },
  weekDayLabelToday: { color: t.accent },
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
  genderCardSelected: { borderColor: t.accent, backgroundColor: t.selectedBg },
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
  sectionHeaderRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 20, marginBottom: 10,
  },
  seeAllText: { color: t.accent, fontSize: 13, fontWeight: '600' },
  habitWeekCard: {
    backgroundColor: t.surface, borderWidth: 1, borderColor: t.border,
    borderRadius: 10, overflow: 'hidden', marginBottom: 4,
  },
  habitWeekHeader: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: t.border,
    paddingVertical: 8, backgroundColor: t.bg,
  },
  habitWeekDayCol: { flex: 1, alignItems: 'center' },
  habitWeekDayLabel: { color: t.textSecondary, fontSize: 10, fontWeight: '600' },
  habitWeekRow: {
    flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: t.border,
    minHeight: 32, alignItems: 'center',
  },
  habitWeekNameCol: { width: 72, paddingLeft: 8 },
  habitWeekName: { color: t.text, fontSize: 11, fontWeight: '500' },
  habitWeekCell: {
    flex: 1, margin: 3, aspectRatio: 1, borderRadius: 4,
    backgroundColor: t.border,
  },
  habitWeekCellDone: { backgroundColor: t.success },
  habitWeekMore: { padding: 10, alignItems: 'center' },
  habitWeekMoreText: { color: t.accent, fontSize: 12, fontWeight: '600' },

})
