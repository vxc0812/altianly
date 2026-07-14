import React, { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../types'
import { useTheme } from '../context/ThemeContext'
import { Theme } from '../constants/theme'
import { Button } from '../components'
import { getCheckin, saveCheckin, checkinDateStr } from '../services/checkins'

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Checkin'> }

const MOOD_FACES = ['😞', '😕', '😐', '🙂', '😄']
const ENERGY_LABELS = ['Drained', 'Low', 'OK', 'Good', 'High']
const STRESS_LABELS = ['Calm', 'Mild', 'Some', 'High', 'Maxed']

// A 1–5 selector rendered as pill segments with an optional emoji/label per level.
function Scale({
  value, onChange, labels, faces, activeColor, t,
}: {
  value: number | undefined
  onChange: (v: number) => void
  labels?: string[]
  faces?: string[]
  activeColor: string
  t: Theme
}) {
  const s = styles(t)
  return (
    <View style={s.scaleRow}>
      {[1, 2, 3, 4, 5].map((n) => {
        const selected = value === n
        return (
          <TouchableOpacity
            key={n}
            style={[s.scaleCell, selected && { borderColor: activeColor, backgroundColor: activeColor + '22' }]}
            onPress={() => onChange(n)}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={labels ? labels[n - 1] : `Level ${n}`}
          >
            {faces ? (
              <Text style={s.scaleFace}>{faces[n - 1]}</Text>
            ) : (
              <Text style={[s.scaleNum, selected && { color: activeColor }]}>{n}</Text>
            )}
            {labels && <Text style={[s.scaleLabel, selected && { color: activeColor }]}>{labels[n - 1]}</Text>}
          </TouchableOpacity>
        )
      })}
    </View>
  )
}

// A +/- stepper for numeric values (sleep hours, water cups).
function Stepper({
  value, onChange, step, min, max, suffix, t,
}: {
  value: number
  onChange: (v: number) => void
  step: number
  min: number
  max: number
  suffix: string
  t: Theme
}) {
  const s = styles(t)
  const round = (n: number) => Math.round(n * 10) / 10
  return (
    <View style={s.stepperRow}>
      <TouchableOpacity
        style={s.stepBtn}
        onPress={() => onChange(round(Math.max(min, value - step)))}
        accessibilityLabel="Decrease"
      >
        <Text style={s.stepBtnText}>−</Text>
      </TouchableOpacity>
      <Text style={s.stepValue}>{value}{suffix}</Text>
      <TouchableOpacity
        style={s.stepBtn}
        onPress={() => onChange(round(Math.min(max, value + step)))}
        accessibilityLabel="Increase"
      >
        <Text style={s.stepBtnText}>+</Text>
      </TouchableOpacity>
    </View>
  )
}

export default function CheckinScreen({ navigation }: Props) {
  const { theme } = useTheme()
  const s = styles(theme)
  const today = checkinDateStr()

  const [mood, setMood] = useState<number | undefined>()
  const [energy, setEnergy] = useState<number | undefined>()
  const [stress, setStress] = useState<number | undefined>()
  const [sleepHours, setSleepHours] = useState(7.5)
  const [waterCups, setWaterCups] = useState(0)
  const [note, setNote] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    (async () => {
      const existing = await getCheckin(today)
      if (existing) {
        setMood(existing.mood)
        setEnergy(existing.energy)
        setStress(existing.stress)
        if (typeof existing.sleepHours === 'number') setSleepHours(existing.sleepHours)
        if (typeof existing.waterCups === 'number') setWaterCups(existing.waterCups)
        setNote(existing.note ?? '')
      }
    })()
  }, [today])

  async function handleSave() {
    await saveCheckin(today, {
      mood, energy, stress,
      sleepHours, waterCups,
      note: note.trim() || undefined,
    })
    setSaved(true)
    setTimeout(() => navigation.goBack(), 650)
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.backText}>{'< Back'}</Text>
        </TouchableOpacity>
        <Text style={s.heading}>Daily Check-in</Text>
        <View style={{ width: 50 }} />
      </View>

      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <Text style={s.subtitle}>How are you today? Log what you like — it all feeds your Health Score.</Text>

        <Text style={s.question}>Mood</Text>
        <Scale value={mood} onChange={setMood} faces={MOOD_FACES} activeColor={theme.accent} t={theme} />

        <Text style={s.question}>Energy</Text>
        <Scale value={energy} onChange={setEnergy} labels={ENERGY_LABELS} activeColor={theme.success} t={theme} />

        <Text style={s.question}>Stress</Text>
        <Scale value={stress} onChange={setStress} labels={STRESS_LABELS} activeColor={theme.danger} t={theme} />

        <Text style={s.question}>Sleep last night</Text>
        <Stepper value={sleepHours} onChange={setSleepHours} step={0.5} min={0} max={14} suffix=" hrs" t={theme} />

        <Text style={s.question}>Water today</Text>
        <Stepper value={waterCups} onChange={setWaterCups} step={1} min={0} max={20} suffix=" cups" t={theme} />

        <Text style={s.question}>Note <Text style={s.optional}>(optional)</Text></Text>
        <TextInput
          style={s.noteInput}
          value={note}
          onChangeText={setNote}
          placeholder="Anything on your mind?"
          placeholderTextColor={theme.textMuted}
          multiline
          accessibilityLabel="Optional note about your day"
        />

        {saved && (
          <View style={s.savedBanner}>
            <Text style={s.savedText}>✓ Check-in saved</Text>
          </View>
        )}

        <Button title="Save Check-in" onPress={handleSave} style={{ marginTop: 20 }} accessibilityLabel="Save today's check-in" />
      </ScrollView>
    </View>
  )
}

const styles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 24, paddingTop: 60,
  },
  backText: { color: t.accent, fontSize: 16 },
  heading: { color: t.text, fontSize: 20, fontWeight: '700' },
  content: { padding: 24, paddingTop: 0, paddingBottom: 60 },
  subtitle: { color: t.textSecondary, fontSize: 14, lineHeight: 20, marginBottom: 8 },
  question: { fontSize: 15, fontWeight: '700', color: t.text, marginTop: 22, marginBottom: 10 },
  optional: { fontSize: 12, fontWeight: '400', color: t.textMuted },

  scaleRow: { flexDirection: 'row', gap: 8 },
  scaleCell: {
    flex: 1, alignItems: 'center', paddingVertical: 12, paddingHorizontal: 2,
    backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: 10,
  },
  scaleFace: { fontSize: 24 },
  scaleNum: { fontSize: 18, fontWeight: '700', color: t.textSecondary },
  scaleLabel: { fontSize: 10, color: t.textSecondary, marginTop: 4, fontWeight: '600' },

  stepperRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  stepBtn: {
    width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center',
    backgroundColor: t.surface, borderWidth: 1, borderColor: t.border,
  },
  stepBtnText: { fontSize: 26, fontWeight: '700', color: t.accent },
  stepValue: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '700', color: t.text },

  noteInput: {
    backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: 10,
    padding: 14, color: t.text, fontSize: 15, minHeight: 70, textAlignVertical: 'top',
  },
  savedBanner: {
    marginTop: 18, padding: 12, borderRadius: 8, alignItems: 'center',
    backgroundColor: t.success + '22', borderWidth: 1, borderColor: t.success + '55',
  },
  savedText: { color: t.success, fontSize: 14, fontWeight: '700' },
})
