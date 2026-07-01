import React, { useCallback, useState } from 'react'
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform,
} from 'react-native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useFocusEffect } from '@react-navigation/native'
import type { RootStackParamList, Habit, HabitType, HabitEntry } from '../types'
import { useTheme } from '../context/ThemeContext'
import { Theme } from '../constants/theme'
import { HabitGrid } from '../components/HabitGrid'
import { HabitForm } from '../components/HabitForm'
import {
  getAllHabits, createHabit, updateHabit, deleteHabit,
  logHabitEntry, getWeekEntries, formatDate, getEntryForDate,
} from '../services/habits'

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Habits'> }

export default function HabitsScreen({ navigation }: Props) {
  const { theme } = useTheme()
  const s = styles(theme)

  const [habits, setHabits] = useState<Habit[]>([])
  const [weekEntries, setWeekEntries] = useState<Record<string, (HabitEntry | null)[]>>({})
  const [weekDates, setWeekDates] = useState<string[]>([])
  const [formVisible, setFormVisible] = useState(false)
  const [editHabit, setEditHabit] = useState<Habit | null>(null)

  useFocusEffect(useCallback(() => { loadData() }, []))

  async function loadData() {
    const allHabits = await getAllHabits()
    setHabits(allHabits)

    const dates = getWeekDateStrings()
    setWeekDates(dates)

    const entries: Record<string, (HabitEntry | null)[]> = {}
    for (const habit of allHabits) {
      const week: (HabitEntry | null)[] = []
      for (const date of dates) {
        const entry = await getEntryForDate(habit.id, date)
        week.push(entry)
      }
      entries[habit.id] = week
    }
    setWeekEntries(entries)
  }

  function getWeekDateStrings(): string[] {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const monday = new Date(today)
    monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7))

    const dates: string[] = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      dates.push(formatDate(d))
    }
    return dates
  }

  async function handleToggle(habitId: string, date: string, currentEntry: HabitEntry | null) {
    const habit = habits.find((h) => h.id === habitId)
    if (!habit) return

    if (currentEntry && !currentEntry.skipped) {
      await logHabitEntry(habitId, currentEntry.value, true)
    } else {
      if (habit.type === 'yesno') {
        await logHabitEntry(habitId, currentEntry ? 'false' : 'true')
      } else {
        await logHabitEntry(habitId, '1')
      }
    }
    await loadData()
  }

  async function handleSave(name: string, type: HabitType, target?: number, unit?: string, options?: string[]) {
    if (editHabit) {
      await updateHabit(editHabit.id, name, type, target, unit, options)
    } else {
      await createHabit(name, type, target, unit, options)
    }
    setEditHabit(null)
    setFormVisible(false)
    await loadData()
  }

  function handleEdit(habit: Habit) {
    setEditHabit(habit)
    setFormVisible(true)
  }

  async function handleDelete(id: string) {
    await deleteHabit(id)
    await loadData()
  }

  function handleNew() {
    setEditHabit(null)
    setFormVisible(true)
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.backText}>{'< Back'}</Text>
        </TouchableOpacity>
        <Text style={s.heading}>Habits</Text>
        <TouchableOpacity onPress={handleNew}>
          <Text style={s.addText}>+ New</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        <HabitGrid
          habits={habits}
          weekEntries={weekEntries}
          weekDates={weekDates}
          onToggle={handleToggle}
        />

        {habits.map((habit) => {
          const entries = weekEntries[habit.id] || []
          const doneCount = entries.filter((e) => e && !e.skipped).length
          return (
            <TouchableOpacity
              key={habit.id}
              style={s.habitCard}
              onPress={() => handleEdit(habit)}
              accessibilityRole="button"
              accessibilityLabel={`Edit ${habit.name}, ${doneCount}/7 this week`}
            >
              <View style={{ flex: 1 }}>
                <Text style={s.habitCardName}>{habit.name}</Text>
                <Text style={s.habitCardMeta}>
                  {habit.type === 'yesno' ? 'Check-in' : habit.type === 'number' ? `Count${habit.target ? ` ≥ ${habit.target}${habit.unit ? ` ${habit.unit}` : ''}` : ''}` : habit.type === 'time' ? `Time${habit.target ? ` ≥ ${habit.target} min` : ''}` : 'Select'}
                  {' · '}{doneCount}/7 this week
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleDelete(habit.id)}
                style={s.deleteBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Text style={s.deleteText}>Delete</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )
        })}

        <View style={{ height: 40 }} />
      </ScrollView>

      <HabitForm
        visible={formVisible}
        onClose={() => { setFormVisible(false); setEditHabit(null) }}
        onSave={handleSave}
        editHabit={editHabit}
      />
    </View>
  )
}

const styles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24,
    paddingTop: 60,
  },
  backText: { color: t.accent, fontSize: 16 },
  heading: { color: t.text, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  addText: { color: t.accent, fontSize: 16, fontWeight: '700' },
  content: { padding: 24, paddingTop: 0, paddingBottom: 40 },
  habitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.surface,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 8,
    padding: 14,
    marginTop: 10,
  },
  habitCardName: { color: t.text, fontSize: 15, fontWeight: '600' },
  habitCardMeta: { color: t.textSecondary, fontSize: 12, marginTop: 2 },
  deleteBtn: { paddingLeft: 12 },
  deleteText: { color: t.danger, fontSize: 13, fontWeight: '600' },
})
