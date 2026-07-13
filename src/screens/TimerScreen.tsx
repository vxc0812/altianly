import React, { useState, useEffect, useRef, useCallback } from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RouteProp } from '@react-navigation/native'
import { RootStackParamList } from '../types'
import { useTheme } from '../context/ThemeContext'
import { Theme } from '../constants/theme'

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Timer'>
  route: RouteProp<RootStackParamList, 'Timer'>
}

const PRESETS = [30, 60, 90, 120]

export default function TimerScreen({ navigation, route }: Props) {
  const { theme } = useTheme()
  const s = styles(theme)
  const initial = route.params?.initialSeconds || 60
  const [totalSeconds, setTotalSeconds] = useState(initial)
  const [remaining, setRemaining] = useState(initial)
  const [isRunning, setIsRunning] = useState(false)
  const [isDone, setIsDone] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const hasAutoStarted = useRef(false)

  const clearTimer = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
  }, [])

  useEffect(() => {
    return clearTimer
  }, [clearTimer])

  useEffect(() => {
    if (route.params?.initialSeconds && !hasAutoStarted.current) {
      hasAutoStarted.current = true
      start()
    }
  }, [route.params?.initialSeconds])

  function start() {
    if (remaining <= 0) { reset() }
    setIsDone(false)
    setIsRunning(true)
    clearTimer()
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) { clearTimer(); setIsRunning(false); setIsDone(true); return 0 }
        return prev - 1
      })
    }, 1000)
  }

  function pause() {
    clearTimer()
    setIsRunning(false)
  }

  function reset() {
    clearTimer()
    setRemaining(totalSeconds)
    setIsRunning(false)
    setIsDone(false)
  }

  function selectPreset(sec: number) {
    clearTimer()
    setTotalSeconds(sec)
    setRemaining(sec)
    setIsRunning(false)
    setIsDone(false)
  }

  const mins = Math.floor(remaining / 60)
  const secs = remaining % 60
  const display = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  const progress = totalSeconds > 0 ? remaining / totalSeconds : 0
  const isFlashing = isDone

  return (
    <View style={s.container}>
      <View style={s.headerRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={s.backText}>{'< Back'}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Main', { screen: 'Home' } as never)}>
          <Text style={s.homeText}>Home</Text>
        </TouchableOpacity>
      </View>

      <Text style={s.heading}>Rest Timer</Text>

      <View style={s.timerSection}>
        <View style={[s.progressBar, { backgroundColor: theme.border }]}>
          <View style={[s.progressFill, {
            width: `${progress * 100}%`,
            backgroundColor: isFlashing ? theme.danger : theme.accent,
          }]} />
        </View>

        <Text style={[s.timerDisplay, isFlashing && s.timerFlashing]}>
          {isDone ? "Time's up!" : display}
        </Text>
      </View>

      <View style={s.presetsRow}>
        {PRESETS.map((sec) => (
          <TouchableOpacity
            key={sec}
            style={[s.presetChip, totalSeconds === sec && s.presetChipSelected]}
            onPress={() => selectPreset(sec)}
          >
            <Text style={[s.presetText, totalSeconds === sec && s.presetTextSelected]}>{sec}s</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.controls}>
        {!isRunning ? (
          <TouchableOpacity style={s.controlBtn} onPress={start}>
            <Text style={s.controlBtnText}>▶ Start</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={s.controlBtn} onPress={pause}>
            <Text style={s.controlBtnText}>⏸ Pause</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[s.controlBtn, s.resetBtn]} onPress={reset}>
          <Text style={s.resetBtnText}>↺ Reset</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg, padding: 24, paddingTop: 60 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  backText: { color: t.accent, fontSize: 16 },
  homeText: { color: t.accent, fontSize: 16, fontWeight: '600' },
  heading: { fontSize: 24, fontWeight: '700', color: t.text, marginBottom: 32, textAlign: 'center' },
  timerSection: { alignItems: 'center', marginBottom: 40 },
  progressBar: { width: '100%', height: 6, borderRadius: 3, overflow: 'hidden', marginBottom: 32 },
  progressFill: { height: '100%', borderRadius: 3 },
  timerDisplay: { fontSize: 64, fontWeight: '800', color: t.text, fontVariant: ['tabular-nums'] },
  timerFlashing: { color: t.danger },
  presetsRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginBottom: 32 },
  presetChip: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border },
  presetChipSelected: { borderColor: t.accent, backgroundColor: t.selectedBg },
  presetText: { fontSize: 16, fontWeight: '600', color: t.text },
  presetTextSelected: { color: t.accent },
  controls: { flexDirection: 'row', justifyContent: 'center', gap: 16 },
  controlBtn: { paddingVertical: 14, paddingHorizontal: 32, borderRadius: 10, backgroundColor: t.accent },
  controlBtnText: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  resetBtn: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border },
  resetBtnText: { fontSize: 18, fontWeight: '700', color: t.text },
})