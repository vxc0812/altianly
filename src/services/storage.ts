import AsyncStorage from '@react-native-async-storage/async-storage'
import { WorkoutPlan, LLMConfig } from '../types'
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
