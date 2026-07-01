import AsyncStorage from '@react-native-async-storage/async-storage'
import * as SecureStore from 'expo-secure-store'
import { Platform } from 'react-native'
import { WorkoutPlan, LLMConfig, WorkoutLog, BMIHistoryEntry, UserProfile } from '../types'
import { STORAGE_KEYS, SESSION_DURATION_MS } from '../constants'

function secureStoreAvailable(): boolean {
  return Platform.OS !== 'web'
}

async function secureSet(key: string, value: string): Promise<void> {
  if (secureStoreAvailable()) {
    await SecureStore.setItemAsync(key, value)
    return
  }
  console.warn(`SecureStore unavailable on ${Platform.OS}; storing "${key}" in AsyncStorage (unencrypted)`)
  await AsyncStorage.setItem(key, value)
}

async function secureGet(key: string): Promise<string | null> {
  if (secureStoreAvailable()) {
    return await SecureStore.getItemAsync(key)
  }
  return await AsyncStorage.getItem(key)
}

async function secureDelete(key: string): Promise<void> {
  if (secureStoreAvailable()) {
    await SecureStore.deleteItemAsync(key)
    return
  }
  await AsyncStorage.removeItem(key)
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

export async function saveBMIEntry(entry: BMIHistoryEntry): Promise<void> {
  const json = await AsyncStorage.getItem(STORAGE_KEYS.BMI_HISTORY)
  const history: BMIHistoryEntry[] = json ? JSON.parse(json) : []
  history.unshift(entry)
  await AsyncStorage.setItem(STORAGE_KEYS.BMI_HISTORY, JSON.stringify(history.slice(0, 100)))
}

export async function getBMIHistory(): Promise<BMIHistoryEntry[]> {
  const json = await AsyncStorage.getItem(STORAGE_KEYS.BMI_HISTORY)
  return json ? JSON.parse(json) : []
}

export async function deleteBMIEntry(timestamp: number): Promise<void> {
  const json = await AsyncStorage.getItem(STORAGE_KEYS.BMI_HISTORY)
  if (!json) return
  const history: BMIHistoryEntry[] = JSON.parse(json)
  await AsyncStorage.setItem(
    STORAGE_KEYS.BMI_HISTORY,
    JSON.stringify(history.filter((e) => e.timestamp !== timestamp))
  )
}

export async function clearBMIHistory(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.BMI_HISTORY)
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await secureSet(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile))
}

export async function getUserProfile(): Promise<UserProfile | null> {
  const json = await secureGet(STORAGE_KEYS.USER_PROFILE)
  return json ? JSON.parse(json) : null
}

export async function deleteUserProfile(): Promise<void> {
  await secureDelete(STORAGE_KEYS.USER_PROFILE)
  await clearLastActivity()
}

export async function updateLastActivity(): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, String(Date.now()))
}

export async function getLastActivity(): Promise<number | null> {
  const val = await AsyncStorage.getItem(STORAGE_KEYS.LAST_ACTIVITY)
  return val ? Number(val) : null
}

export async function clearLastActivity(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEYS.LAST_ACTIVITY)
}

export async function isSessionExpired(): Promise<boolean> {
  const last = await getLastActivity()
  if (last === null) return true
  return Date.now() - last > SESSION_DURATION_MS
}