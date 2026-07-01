import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import type { Habit, HabitEntry } from '../types'
import { useTheme } from '../context/ThemeContext'
import { Theme } from '../constants/theme'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

interface Props {
  habits: Habit[]
  weekEntries: Record<string, (HabitEntry | null)[]>
  weekDates: string[]
  onToggle: (habitId: string, date: string, currentEntry: HabitEntry | null) => void
}

export function HabitGrid({ habits, weekEntries, weekDates, onToggle }: Props) {
  const { theme } = useTheme()
  const s = styles(theme)

  if (habits.length === 0) {
    return (
      <View style={s.empty}>
        <Text style={s.emptyText}>No habits yet. Tap + to create one.</Text>
      </View>
    )
  }

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={s.grid}>
        <View style={s.headerRow}>
          <View style={s.labelCol} />
          {DAY_LABELS.map((label, i) => (
            <View key={label} style={[s.dayCol, i === DAY_LABELS.length - 1 ? { borderRightWidth: 0 } : undefined]}>
              <Text style={[s.dayLabel, isToday(weekDates[i]) && s.dayLabelToday]}>{label}</Text>
            </View>
          ))}
        </View>

        {habits.map((habit) => {
          const entries = weekEntries[habit.id] || []
          return (
            <View key={habit.id} style={s.habitRow}>
              <View style={s.labelCol}>
                <Text style={s.habitName} numberOfLines={1}>{habit.name}</Text>
              </View>
              {entries.map((entry, i) => {
                const date = weekDates[i]
                const completed = !!(entry && !entry.skipped && isCompleted(entry, habit))
                return (
                  <TouchableOpacity
                    key={`${habit.id}-${i}`}
                    style={[
                      s.cell,
                      i === entries.length - 1 ? { borderRightWidth: 0 } : undefined,
                      completed && s.cellCompleted,
                    ]}
                    onPress={() => onToggle(habit.id, date, entry)}
                    accessibilityRole="button"
                    accessibilityLabel={`${habit.name} on ${DAY_LABELS[i]}: ${completed ? 'completed' : 'not completed'}`}
                  >
                    {completed && <Text style={s.checkmark}>✓</Text>}
                    {entry?.skipped && <Text style={s.skipped}>-</Text>}
                  </TouchableOpacity>
                )
              })}
            </View>
          )
        })}
      </View>
    </ScrollView>
  )
}

function isToday(dateStr: string): boolean {
  const d = new Date()
  const today = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return dateStr === today
}

function isCompleted(entry: HabitEntry, habit: Habit): boolean {
  if (entry.skipped) return false
  if (habit.type === 'yesno') return entry.value === 'true'
  if (habit.type === 'number' || habit.type === 'time') {
    const val = parseFloat(entry.value)
    if (isNaN(val)) return false
    return habit.target ? val >= habit.target : val > 0
  }
  return !!entry.value
}

const styles = (t: Theme) => StyleSheet.create({
  grid: {
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 10,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: t.surface,
    borderBottomWidth: 1,
    borderBottomColor: t.border,
  },
  labelCol: {
    width: 90,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  dayCol: {
    width: 40,
    paddingVertical: 10,
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: t.border,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: t.textSecondary,
  },
  dayLabelToday: {
    color: t.accent,
    fontWeight: '800',
  },
  habitRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: t.border,
    minHeight: 40,
    alignItems: 'center',
  },
  habitName: {
    fontSize: 13,
    fontWeight: '600',
    color: t.text,
  },
  cell: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: t.border,
  },
  cellCompleted: {
    backgroundColor: t.success + '18',
  },
  checkmark: {
    fontSize: 16,
    color: t.success,
    fontWeight: '700',
  },
  skipped: {
    fontSize: 14,
    color: t.textMuted,
    fontWeight: '600',
  },
  empty: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: t.textSecondary,
    fontSize: 14,
  },
})
