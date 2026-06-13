import AsyncStorage from '@react-native-async-storage/async-storage'
import { WorkoutPlan, LLMConfig, WorkoutLog } from '../types'
import { STORAGE_KEYS } from '../constants'

async function secureSet(key: string, value: string): Promise<void> {
  try {
    const SecureStore = require('expo-secure-store')
    await SecureStore.setItemAsync(key, value)
  } catch {
    await AsyncStorage.setItem(key, value)
  }
}

async function secureGet(key: string): Promise<string | null> {
  try {
    const SecureStore = require('expo-secure-store')
    return await SecureStore.getItemAsync(key)
  } catch {
    return await AsyncStorage.getItem(key)
  }
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