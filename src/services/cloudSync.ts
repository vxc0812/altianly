import AsyncStorage from '@react-native-async-storage/async-storage'
import { BMIHistoryEntry } from '../types'
import { DEFAULT_LLM_CONFIGS } from '../constants'

const SYNC_URL_KEY = 'altianly_sync_url'

export async function getSyncUrl(): Promise<string | null> {
  const url = await AsyncStorage.getItem(SYNC_URL_KEY)
  return url || DEFAULT_LLM_CONFIGS.cloudflare.baseUrl
}

export async function setSyncUrl(url: string): Promise<void> {
  await AsyncStorage.setItem(SYNC_URL_KEY, url)
}

export async function isCloudSyncAvailable(): Promise<boolean> {
  try {
    const base = await getSyncUrl()
    const res = await fetch(`${base}/data?userId=_ping`, { method: 'GET' })
    return res.ok
  } catch {
    return false
  }
}

export async function syncBMIEntry(
  userId: string,
  entry: BMIHistoryEntry,
): Promise<boolean> {
  try {
    const base = await getSyncUrl()
    const res = await fetch(`${base}/data?userId=${encodeURIComponent(userId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(entry),
    })
    return res.ok
  } catch {
    return false
  }
}

export async function syncGetBMIHistory(userId: string): Promise<BMIHistoryEntry[] | null> {
  try {
    const base = await getSyncUrl()
    const res = await fetch(`${base}/data?userId=${encodeURIComponent(userId)}`, {
      method: 'GET',
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.entries || []
  } catch {
    return null
  }
}

export async function syncDeleteBMIEntry(userId: string, timestamp: number): Promise<boolean> {
  try {
    const base = await getSyncUrl()
    const res = await fetch(`${base}/data/${timestamp}?userId=${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    })
    return res.ok
  } catch {
    return false
  }
}

export async function syncClearBMIHistory(userId: string): Promise<boolean> {
  try {
    const base = await getSyncUrl()
    const res = await fetch(`${base}/data?userId=${encodeURIComponent(userId)}`, {
      method: 'DELETE',
    })
    return res.ok
  } catch {
    return false
  }
}
