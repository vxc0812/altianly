import AsyncStorage from '@react-native-async-storage/async-storage'
import { STORAGE_KEYS } from '../constants'
import type { DailyCheckin } from '../types'

// Daily wellbeing check-ins live entirely in AsyncStorage (no SQLite needed) as
// a single map keyed by local date string — the same lightweight approach the
// web nutrition path uses. One record per day, merged as the user updates it.

export function checkinDateStr(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function readAll(): Promise<Record<string, DailyCheckin>> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.CHECKINS)
    return json ? JSON.parse(json) : {}
  } catch {
    return {}
  }
}

async function writeAll(map: Record<string, DailyCheckin>): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.CHECKINS, JSON.stringify(map))
}

export async function getCheckin(date: string): Promise<DailyCheckin | null> {
  const all = await readAll()
  return all[date] ?? null
}

/**
 * Upsert a check-in for a date, merging with any existing values so partial
 * updates (e.g. just water later in the day) don't wipe earlier entries.
 */
export async function saveCheckin(date: string, partial: Partial<Omit<DailyCheckin, 'date' | 'updatedAt'>>): Promise<DailyCheckin> {
  const all = await readAll()
  const existing = all[date]
  const merged: DailyCheckin = {
    ...(existing ?? {}),
    ...partial,
    date,
    updatedAt: Date.now(),
  }
  all[date] = merged
  await writeAll(all)
  return merged
}

/** Recent check-ins within the last `days` (inclusive of today), newest first. */
export async function getRecentCheckins(days = 7): Promise<DailyCheckin[]> {
  const all = await readAll()
  const cutoff = new Date()
  cutoff.setHours(0, 0, 0, 0)
  cutoff.setDate(cutoff.getDate() - (days - 1))
  const cutoffStr = checkinDateStr(cutoff)
  return Object.values(all)
    .filter((c) => c.date >= cutoffStr)
    .sort((a, b) => b.date.localeCompare(a.date))
}

export async function deleteCheckin(date: string): Promise<void> {
  const all = await readAll()
  if (all[date]) {
    delete all[date]
    await writeAll(all)
  }
}
