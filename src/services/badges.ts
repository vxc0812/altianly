import AsyncStorage from '@react-native-async-storage/async-storage'
import { Badge, BadgeDefinition, BMIHistoryEntry } from '../types'
import { STORAGE_KEYS } from '../constants'
import { getWorkoutHistory } from './storage'

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  { id: 'first_check', label: 'First Check', description: 'Complete your first BMI calculation', icon: '🌟' },
  { id: 'consistency_3', label: 'Consistency 3x', description: 'Check BMI on 3 different days', icon: '🔥' },
  { id: 'streak_7', label: 'Streak Master', description: 'Maintain a 7-day streak', icon: '⚡' },
  { id: 'weekly_user', label: 'Weekly Warrior', description: 'Complete 7 total BMI checks', icon: '📅' },
  { id: 'goal_achiever', label: 'Goal Achiever', description: 'Achieve a normal BMI', icon: '🎯' },
  { id: 'workout_planner', label: 'Workout Planner', description: 'Save your first workout plan', icon: '💪' },
  { id: 'dedicated_30', label: 'Dedicated', description: 'Complete 30 BMI checks', icon: '🏆' },
]

export async function getBadges(): Promise<Badge[]> {
  const json = await AsyncStorage.getItem(STORAGE_KEYS.BADGES)
  return json ? JSON.parse(json) : []
}

export async function saveBadges(badges: Badge[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.BADGES, JSON.stringify(badges))
}

export async function checkAndUnlockBadges(
  bmiHistory: BMIHistoryEntry[],
  streak: number,
): Promise<Badge[]> {
  const existing = await getBadges()
  const existingIds = new Set(existing.map((b) => b.id))
  const now = Date.now()
  const newBadges: Badge[] = []
  const uniqueDays = new Set(bmiHistory.map((e) => {
    const d = new Date(e.timestamp)
    return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
  })).size
  const plans = await getWorkoutHistory()
  const hasNormalBmi = bmiHistory.some((e) => e.evaluation === 'normal')

  for (const def of BADGE_DEFINITIONS) {
    if (existingIds.has(def.id)) continue
    let earned = false

    switch (def.id) {
      case 'first_check':
        earned = bmiHistory.length >= 1
        break
      case 'consistency_3':
        earned = uniqueDays >= 3
        break
      case 'streak_7':
        earned = streak >= 7
        break
      case 'weekly_user':
        earned = bmiHistory.length >= 7
        break
      case 'goal_achiever':
        earned = hasNormalBmi
        break
      case 'workout_planner':
        earned = plans.length >= 1
        break
      case 'dedicated_30':
        earned = bmiHistory.length >= 30
        break
    }

    if (earned) {
      const badge: Badge = { ...def, unlockedAt: now }
      newBadges.push(badge)
    }
  }

  if (newBadges.length > 0) {
    const updated = [...existing, ...newBadges]
    await saveBadges(updated)
  }

  return newBadges
}
