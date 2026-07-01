import React, { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Modal, ScrollView, Platform,
} from 'react-native'
import type { Habit, HabitType } from '../types'
import { useTheme } from '../context/ThemeContext'
import { Theme } from '../constants/theme'

const HABIT_TYPES: { value: HabitType; label: string; desc: string }[] = [
  { value: 'yesno', label: 'Yes/No', desc: 'Simple checkbox' },
  { value: 'number', label: 'Number', desc: 'Count or quantity' },
  { value: 'time', label: 'Time', desc: 'Duration in minutes' },
  { value: 'select', label: 'Select', desc: 'Choose from options' },
]

interface Props {
  visible: boolean
  onClose: () => void
  onSave: (name: string, type: HabitType, target?: number, unit?: string, options?: string[]) => void
  editHabit?: Habit | null
}

export function HabitForm({ visible, onClose, onSave, editHabit }: Props) {
  const { theme } = useTheme()
  const s = styles(theme)

  const [name, setName] = useState(editHabit?.name ?? '')
  const [type, setType] = useState<HabitType>(editHabit?.type ?? 'yesno')
  const [target, setTarget] = useState(editHabit?.target?.toString() ?? '')
  const [unit, setUnit] = useState(editHabit?.unit ?? '')
  const [optionsText, setOptionsText] = useState(editHabit?.options?.join(', ') ?? '')

  function handleSave() {
    if (!name.trim()) return
    const opts = type === 'select' ? optionsText.split(',').map((s) => s.trim()).filter(Boolean) : undefined
    onSave(
      name.trim(),
      type,
      target ? parseFloat(target) : undefined,
      unit || undefined,
      opts,
    )
    reset()
  }

  function reset() {
    setName('')
    setType('yesno')
    setTarget('')
    setUnit('')
    setOptionsText('')
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.sheet}>
          <View style={s.header}>
            <Text style={s.title}>{editHabit ? 'Edit Habit' : 'New Habit'}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={s.cancel}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={s.body}>
            <Text style={s.label}>Name</Text>
            <TextInput
              style={s.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Drink water"
              placeholderTextColor={theme.textMuted}
              autoFocus
            />

            <Text style={s.label}>Type</Text>
            <View style={s.typeRow}>
              {HABIT_TYPES.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[s.typeCard, type === opt.value && s.typeCardSelected]}
                  onPress={() => setType(opt.value)}
                >
                  <Text style={[s.typeLabel, type === opt.value && s.typeLabelSelected]}>{opt.label}</Text>
                  <Text style={s.typeDesc}>{opt.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {(type === 'number' || type === 'time') && (
              <View style={s.row}>
                <View style={{ flex: 2, marginRight: 8 }}>
                  <Text style={s.label}>Target</Text>
                  <TextInput
                    style={s.input}
                    value={target}
                    onChangeText={setTarget}
                    keyboardType="decimal-pad"
                    placeholder={type === 'time' ? 'Minutes' : 'Count'}
                    placeholderTextColor={theme.textMuted}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Unit</Text>
                  <TextInput
                    style={s.input}
                    value={unit}
                    onChangeText={setUnit}
                    placeholder={type === 'time' ? 'min' : 'reps'}
                    placeholderTextColor={theme.textMuted}
                  />
                </View>
              </View>
            )}

            {type === 'select' && (
              <View>
                <Text style={s.label}>Options (comma-separated)</Text>
                <TextInput
                  style={s.input}
                  value={optionsText}
                  onChangeText={setOptionsText}
                  placeholder="e.g. Morning, Afternoon, Evening"
                  placeholderTextColor={theme.textMuted}
                />
              </View>
            )}

            <TouchableOpacity
              style={[s.saveButton, !name.trim() && s.saveButtonDisabled]}
              onPress={handleSave}
              disabled={!name.trim()}
            >
              <Text style={s.saveButtonText}>{editHabit ? 'Save' : 'Create Habit'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  )
}

const styles = (t: Theme) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: t.bg,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '85%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: t.border,
  },
  title: { fontSize: 17, fontWeight: '700', color: t.text },
  cancel: { color: t.accent, fontSize: 16, fontWeight: '600' },
  body: { padding: 20 },
  label: { color: t.text, fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: t.inputBg,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 8,
    padding: 14,
    color: t.text,
    fontSize: 15,
  },
  typeRow: { gap: 6 },
  typeCard: {
    backgroundColor: t.surface,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 8,
    padding: 12,
    marginBottom: 6,
  },
  typeCardSelected: {
    borderColor: t.accent,
    backgroundColor: t.isDark ? '#1C1D22' : '#F9FAFB',
  },
  typeLabel: { fontSize: 14, fontWeight: '700', color: t.text },
  typeLabelSelected: { color: t.accent },
  typeDesc: { fontSize: 11, color: t.textSecondary, marginTop: 2 },
  row: { flexDirection: 'row', alignItems: 'flex-end' },
  saveButton: {
    backgroundColor: t.accent,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  saveButtonDisabled: { opacity: 0.5 },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
})
