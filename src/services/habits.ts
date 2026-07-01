import { getDb } from './database'
import type { Habit, HabitEntry, HabitType } from '../types'

export async function createHabit(
  name: string,
  type: HabitType,
  target?: number,
  unit?: string,
  options?: string[],
): Promise<Habit> {
  const db = await getDb()
  const id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const now = Date.now()

  const stmt = await db.prepareAsync(
    'INSERT INTO habits (id, name, type, target, unit, options, created_at, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  )
  try {
    await stmt.executeAsync(id, name, type, target ?? null, unit ?? null, options ? JSON.stringify(options) : null, now, 0)
  } finally {
    await stmt.finalizeAsync()
  }

  return { id, name, type, target, unit, options, createdAt: now, sortOrder: 0 }
}

export async function updateHabit(
  id: string,
  name: string,
  type: HabitType,
  target?: number,
  unit?: string,
  options?: string[],
): Promise<void> {
  const db = await getDb()
  const stmt = await db.prepareAsync(
    'UPDATE habits SET name = ?, type = ?, target = ?, unit = ?, options = ? WHERE id = ?'
  )
  try {
    await stmt.executeAsync(name, type, target ?? null, unit ?? null, options ? JSON.stringify(options) : null, id)
  } finally {
    await stmt.finalizeAsync()
  }
}

export async function deleteHabit(id: string): Promise<void> {
  const db = await getDb()
  await db.execAsync(`DELETE FROM habits WHERE id = '${id}'`)
}

export async function getAllHabits(): Promise<Habit[]> {
  const db = await getDb()
  const stmt = await db.prepareAsync('SELECT * FROM habits ORDER BY sort_order ASC, created_at ASC')
  try {
    const result = await stmt.executeAsync()
    const rows = await result.getAllAsync() as any[]
    return rows.map(rowToHabit)
  } finally {
    await stmt.finalizeAsync()
  }
}

export async function getHabit(id: string): Promise<Habit | null> {
  const db = await getDb()
  const stmt = await db.prepareAsync('SELECT * FROM habits WHERE id = ?')
  try {
    const result = await stmt.executeAsync(id)
    const row = await result.getFirstAsync() as any
    return row ? rowToHabit(row) : null
  } finally {
    await stmt.finalizeAsync()
  }
}

function rowToHabit(row: any): Habit {
  return {
    id: row.id,
    name: row.name,
    type: row.type as HabitType,
    target: row.target ?? undefined,
    unit: row.unit ?? undefined,
    options: row.options ? JSON.parse(row.options) : undefined,
    createdAt: row.created_at,
    sortOrder: row.sort_order,
  }
}

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export async function logHabitEntry(
  habitId: string,
  value: string,
  skipped = false,
  notes?: string,
): Promise<HabitEntry> {
  const db = await getDb()
  const id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const date = todayStr()
  const now = Date.now()

  const stmt = await db.prepareAsync(
    `INSERT OR REPLACE INTO habit_entries (id, habit_id, date, value, skipped, notes, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
  try {
    await stmt.executeAsync(id, habitId, date, value, skipped ? 1 : 0, notes ?? null, now)
  } finally {
    await stmt.finalizeAsync()
  }

  return { id, habitId, date, value, skipped, notes, createdAt: now }
}

export async function getEntryForDate(habitId: string, date: string): Promise<HabitEntry | null> {
  const db = await getDb()
  const stmt = await db.prepareAsync('SELECT * FROM habit_entries WHERE habit_id = ? AND date = ?')
  try {
    const result = await stmt.executeAsync(habitId, date)
    const row = await result.getFirstAsync() as any
    if (!row) return null
    return {
      id: row.id,
      habitId: row.habit_id,
      date: row.date,
      value: row.value,
      skipped: row.skipped === 1,
      notes: row.notes ?? undefined,
      createdAt: row.created_at,
    }
  } finally {
    await stmt.finalizeAsync()
  }
}

export async function getEntriesForDate(date: string): Promise<HabitEntry[]> {
  const db = await getDb()
  const stmt = await db.prepareAsync('SELECT * FROM habit_entries WHERE date = ?')
  try {
    const result = await stmt.executeAsync(date)
    const rows = await result.getAllAsync() as any[]
    return rows.map((row) => ({
      id: row.id,
      habitId: row.habit_id,
      date: row.date,
      value: row.value,
      skipped: row.skipped === 1,
      notes: row.notes ?? undefined,
      createdAt: row.created_at,
    }))
  } finally {
    await stmt.finalizeAsync()
  }
}

export async function getEntriesForHabit(habitId: string, days = 30): Promise<HabitEntry[]> {
  const db = await getDb()
  const stmt = await db.prepareAsync(
    'SELECT * FROM habit_entries WHERE habit_id = ? ORDER BY date DESC LIMIT ?'
  )
  try {
    const result = await stmt.executeAsync(habitId, days)
    const rows = await result.getAllAsync() as any[]
    return rows.map((row) => ({
      id: row.id,
      habitId: row.habit_id,
      date: row.date,
      value: row.value,
      skipped: row.skipped === 1,
      notes: row.notes ?? undefined,
      createdAt: row.created_at,
    }))
  } finally {
    await stmt.finalizeAsync()
  }
}

export function computeStreak(entries: HabitEntry[]): number {
  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date))

  let streak = 0
  const today = new Date()
  let expected = new Date(today.getFullYear(), today.getMonth(), today.getDate())

  for (const entry of sorted) {
    const entryDate = new Date(entry.date + 'T00:00:00')
    const diff = Math.round((expected.getTime() - entryDate.getTime()) / 86400000)

    if (diff > 1) break

    if (diff === 1) {
      streak++
      expected = entryDate
    } else if (diff === 0 && !entry.skipped) {
      streak++
      expected.setDate(expected.getDate() - 1)
    } else if (diff === 0 && entry.skipped) {
      break
    }
  }

  return streak
}

export async function getWeekEntries(habitId: string): Promise<(HabitEntry | null)[]> {
  const today = new Date()
  const dayOfWeek = today.getDay()
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7))

  const results: (HabitEntry | null)[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    const dateStr = formatDate(d)
    const entry = await getEntryForDate(habitId, dateStr)
    results.push(entry)
  }
  return results
}
