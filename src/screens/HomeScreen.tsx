import React, { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList, Gender, UnitSystem } from '../types'
import { useTheme } from '../context/ThemeContext'
import { Theme } from '../constants/theme'
import { CM_PER_INCH, LBS_PER_KG } from '../constants'

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Home'> }

const genderOptions: { value: Gender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
]

export default function HomeScreen({ navigation }: Props) {
  const { theme } = useTheme()
  const s = styles(theme)
  const [age, setAge] = useState('')
  const [gender, setGender] = useState<Gender | null>(null)
  const [unitSystem, setUnitSystem] = useState<UnitSystem>('imperial')
  const [feet, setFeet] = useState('')
  const [inches, setInches] = useState('')
  const [weight, setWeight] = useState('')
  const [error, setError] = useState('')

  function handleCalculate() {
    setError('')
    const a = parseInt(age, 10)
    const g = gender

    if (!a || a < 1 || a > 120) { setError('Please enter a valid age (1-120)'); return }
    if (!g) { setError('Please select your gender'); return }

    let f: number, i: number, w: number

    if (unitSystem === 'metric') {
      const cm = parseInt(feet, 10)
      const kg = parseFloat(weight)
      if (!cm || cm < 30 || cm > 250) { setError('Please enter a valid height in cm (30-250)'); return }
      if (!kg || kg < 9 || kg > 450) { setError('Please enter a valid weight in kg (9-450)'); return }
      const totalInches = cm / CM_PER_INCH
      f = Math.floor(totalInches / 12)
      i = Math.round(totalInches - f * 12)
      w = kg * LBS_PER_KG
    } else {
      f = parseInt(feet, 10)
      i = parseInt(inches, 10) || 0
      w = parseFloat(weight)
      if (!f || f < 1 || f > 8) { setError('Please enter a valid height in feet (1-8)'); return }
      if (i < 0 || i > 11) { setError('Inches must be between 0 and 11'); return }
      if (!w || w < 20 || w > 1000) { setError('Please enter a valid weight in lbs (20-1000)'); return }
    }

    navigation.navigate('Result', {
      userInput: { age: a, gender: g, unitSystem, heightFeet: f, heightInches: i, weightLbs: Math.round(w) },
    })
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        <View style={s.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.title}>Altianly</Text>
            <Text style={s.subtitle}>BMI Calculator</Text>
          </View>
          <TouchableOpacity style={s.settingsButton} onPress={() => navigation.navigate('Settings')}>
            <Text style={s.settingsText}>Settings</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={s.historyLink} onPress={() => navigation.navigate('History')}>
          <Text style={s.historyLinkText}>View Saved Workouts</Text>
        </TouchableOpacity>

        <View style={s.unitToggle}>
          <TouchableOpacity
            style={[s.unitButton, unitSystem === 'imperial' && s.unitButtonActive]}
            onPress={() => setUnitSystem('imperial')}
          >
            <Text style={[s.unitButtonText, unitSystem === 'imperial' && s.unitButtonTextActive]}>Imperial</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.unitButton, unitSystem === 'metric' && s.unitButtonActive]}
            onPress={() => setUnitSystem('metric')}
          >
            <Text style={[s.unitButtonText, unitSystem === 'metric' && s.unitButtonTextActive]}>Metric</Text>
          </TouchableOpacity>
        </View>

        <View style={s.inputGroup}>
          <Text style={s.label}>Gender</Text>
          <View style={s.genderRow}>
            {genderOptions.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[s.genderCard, gender === opt.value && s.genderCardSelected]}
                onPress={() => setGender(opt.value)}
              >
                <Text style={[s.genderLabel, gender === opt.value && s.genderLabelSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={s.inputGroup}>
          <Text style={s.label}>Age</Text>
          <TextInput
            style={s.input}
            value={age}
            onChangeText={setAge}
            keyboardType="number-pad"
            placeholder="Years"
            maxLength={3}
            placeholderTextColor={theme.textMuted}
          />
        </View>

        <View style={s.inputGroup}>
          <Text style={s.label}>Height</Text>
          {unitSystem === 'imperial' ? (
            <View style={s.row}>
              <View style={s.halfInput}>
                <TextInput
                  style={s.input}
                  value={feet}
                  onChangeText={setFeet}
                  keyboardType="number-pad"
                  placeholder="Feet"
                  maxLength={1}
                  placeholderTextColor={theme.textMuted}
                />
              </View>
              <View style={s.halfInput}>
                <TextInput
                  style={s.input}
                  value={inches}
                  onChangeText={setInches}
                  keyboardType="number-pad"
                  placeholder="Inches"
                  maxLength={2}
                  placeholderTextColor={theme.textMuted}
                />
              </View>
            </View>
          ) : (
            <TextInput
              style={s.input}
              value={feet}
              onChangeText={setFeet}
              keyboardType="number-pad"
              placeholder="Centimeters (cm)"
              maxLength={3}
              placeholderTextColor={theme.textMuted}
            />
          )}
        </View>

        <View style={s.inputGroup}>
          <Text style={s.label}>Weight</Text>
          <TextInput
            style={s.input}
            value={weight}
            onChangeText={setWeight}
            keyboardType="decimal-pad"
            placeholder={unitSystem === 'imperial' ? 'Pounds (lbs)' : 'Kilograms (kg)'}
            placeholderTextColor={theme.textMuted}
          />
        </View>

        {error ? <Text style={s.error}>{error}</Text> : null}

        <TouchableOpacity style={s.button} onPress={handleCalculate}>
          <Text style={s.buttonText}>Calculate BMI</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  content: { padding: 24, paddingTop: 60 },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20 },
  title: { fontSize: 32, fontWeight: '800', color: t.accent },
  subtitle: { fontSize: 16, color: t.textSecondary, marginTop: 4 },
  settingsButton: { padding: 8, marginTop: 4 },
  settingsText: { color: t.accent, fontSize: 14, fontWeight: '600' },
  historyLink: { alignSelf: 'center', marginBottom: 24 },
  historyLinkText: { color: t.textSecondary, fontSize: 14, textDecorationLine: 'underline' },
  unitToggle: { flexDirection: 'row', backgroundColor: t.surface, borderRadius: 8, borderWidth: 1, borderColor: t.border, marginBottom: 20 },
  unitButton: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 7 },
  unitButtonActive: { backgroundColor: t.accent },
  unitButtonText: { fontSize: 14, fontWeight: '600', color: t.textSecondary },
  unitButtonTextActive: { color: '#FFF' },
  inputGroup: { marginBottom: 20 },
  genderRow: { flexDirection: 'row', gap: 10 },
  genderCard: {
    flex: 1,
    backgroundColor: t.inputBg,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  genderCardSelected: { borderColor: t.accent, backgroundColor: t.isDark ? '#1C2533' : '#F3EDFF' },
  genderLabel: { color: t.textSecondary, fontSize: 14, fontWeight: '600' },
  genderLabelSelected: { color: t.accent },
  label: { color: t.text, fontSize: 14, fontWeight: '600', marginBottom: 6 },
  input: {
    backgroundColor: t.inputBg,
    borderWidth: 1,
    borderColor: t.border,
    borderRadius: 8,
    padding: 14,
    color: t.text,
    fontSize: 16,
  },
  row: { flexDirection: 'row', gap: 12 },
  halfInput: { flex: 1 },
  error: { color: t.danger, textAlign: 'center', marginBottom: 16 },
  button: { backgroundColor: t.success, padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  buttonText: { color: t.successText, fontSize: 16, fontWeight: '700' },
})