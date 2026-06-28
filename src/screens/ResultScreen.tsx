import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RouteProp } from '@react-navigation/native'
import { RootStackParamList, UserInput, Lifestyle, ExerciseLevel, TrainingSplit, PrimaryGoal, WorkoutEnvironment } from '../types'
import { calculateBMI } from '../services/bmi'
import { useTheme } from '../context/ThemeContext'
import { Theme } from '../constants/theme'
import { Button, Card } from '../components'

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Result'>
  route: RouteProp<RootStackParamList, 'Result'>
}

const evaluationColors: Record<string, string> = {
  underweight: '#58A6FF',
  normal: '#3FB950',
  overweight: '#D29922',
  obese: '#F85149',
}

const evaluationLabels: Record<string, string> = {
  underweight: 'Underweight',
  normal: 'Normal Weight',
  overweight: 'Overweight',
  obese: 'Obese',
}

const lifestyleOptions: { value: Lifestyle; label: string; desc: string }[] = [
  { value: 'sedentary', label: 'Sedentary', desc: 'Little or no daily exercise' },
  { value: 'moderate', label: 'Moderate', desc: 'Light activity 1-3 days/week' },
  { value: 'active', label: 'Active', desc: 'Active job or exercise 4+ days/week' },
]

const exerciseOptions: { value: ExerciseLevel; label: string; desc: string }[] = [
  { value: 'low', label: 'Low', desc: 'Beginner, little workout experience' },
  { value: 'medium', label: 'Medium', desc: 'Some experience, can do moderate workouts' },
  { value: 'high', label: 'High', desc: 'Experienced, ready for intense training' },
]

const goalOptions: { value: PrimaryGoal; label: string; desc: string }[] = [
  { value: 'fat_loss', label: 'Fat Loss', desc: 'Lose weight, burn calories' },
  { value: 'muscle_gain', label: 'Build Muscle', desc: 'Gain muscle size and definition' },
  { value: 'strength', label: 'Strength', desc: 'Get stronger, lift heavier' },
  { value: 'endurance', label: 'Endurance', desc: 'Improve cardio and stamina' },
  { value: 'health', label: 'General Health', desc: 'Stay active and well' },
]

const environmentOptions: { value: WorkoutEnvironment; label: string; desc: string }[] = [
  { value: 'home_none', label: 'No Equipment', desc: 'Bodyweight only' },
  { value: 'home_basic', label: 'Minimal Gear', desc: 'Dumbbells, bands, basics' },
  { value: 'gym', label: 'Full Gym', desc: 'All machines and free weights' },
]

const timelineOptions: { value: string; label: string }[] = [
  { value: '4 weeks', label: '4 Weeks' },
  { value: '8 weeks', label: '8 Weeks' },
  { value: '12 weeks', label: '12 Weeks' },
  { value: 'Long-term (6+ months)', label: 'Long-term' },
]

const injuryOptions: { value: string; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'Lower body limitations (knees/hips)', label: 'Lower Body' },
  { value: 'Upper body limitations (shoulders)', label: 'Upper Body' },
  { value: 'Back issues', label: 'Back' },
]

function deriveTrainingSplit(lifestyle: Lifestyle, exerciseLevel: ExerciseLevel): TrainingSplit {
  if (exerciseLevel === 'high') return 'ppl'
  if (exerciseLevel === 'medium' || lifestyle === 'active') return 'upper_lower'
  return 'full_body'
}

interface Recommendation {
  icon: string
  title: string
  body: string
}

function getRecommendations(evaluation: string, userInput: UserInput): Recommendation[] {
  const { age } = userInput
  const tips: Recommendation[] = []

  const nutritionMap: Record<string, string> = {
    underweight: 'Focus on nutrient-dense foods. Eat small, frequent meals with healthy fats, proteins, and complex carbs to gain weight safely.',
    normal: 'Maintain a balanced diet rich in whole foods, lean proteins, vegetables, and healthy fats. Stay hydrated and limit processed foods.',
    overweight: 'Create a moderate calorie deficit. Prioritize protein and fiber to stay full, and reduce added sugars and refined carbs.',
    obese: 'Focus on whole foods and gradual calorie reduction. Consider consulting a dietitian for a structured nutrition plan.',
  }

  const activityMap: Record<string, string> = {
    underweight: 'Light resistance training 3x/week to build muscle. Limit cardio to 1-2 short sessions. Focus on compound lifts with progressive overload.',
    normal: 'Mix of cardio and strength training 3-5x/week. Aim for 150 min moderate or 75 min vigorous activity per week.',
    overweight: 'Moderate cardio 4-5x/week plus strength training 3x/week to preserve muscle while losing fat. Aim for 200-300 min weekly.',
    obese: 'Start with low-impact cardio (walking, swimming, cycling) 3-5x/week. Consult a doctor before beginning any exercise program.',
  }

  let ageTip = ''
  if (age < 18) {
    ageTip = 'Focus on foundational movement patterns and bodyweight exercises. Prioritize form over intensity.'
  } else if (age < 30) {
    ageTip = 'Build habits now for lifelong health. Aim for strength training 3x/week and stay consistent.'
  } else if (age < 50) {
    ageTip = 'Incorporate mobility and flexibility work. Balance strength training with adequate recovery.'
  } else {
    ageTip = 'Prioritize joint health and balance training. Low-impact activities like walking, swimming, and yoga are excellent choices.'
  }

  tips.push({ icon: '🥗', title: 'Nutrition', body: nutritionMap[evaluation] })
  tips.push({ icon: '🏃', title: 'Activity', body: activityMap[evaluation] })
  tips.push({ icon: '💡', title: `Health Tip (Age ${age})`, body: ageTip })

  return tips
}

export default function ResultScreen({ navigation, route }: Props) {
  const { theme } = useTheme()
  const s = styles(theme)
  const { userInput } = route.params
  const { bmi, evaluation } = calculateBMI(userInput.weightLbs, userInput.heightFeet, userInput.heightInches)
  const color = evaluationColors[evaluation]
  const recommendations = getRecommendations(evaluation, userInput)

  const [lifestyle, setLifestyle] = useState<Lifestyle | null>(null)
  const [exerciseLevel, setExerciseLevel] = useState<ExerciseLevel | null>(null)
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal | null>(null)
  const [workoutEnvironment, setWorkoutEnvironment] = useState<WorkoutEnvironment | null>(null)
  const [targetTimeline, setTargetTimeline] = useState<string | null>(null)
  const [injuries, setInjuries] = useState<string>('none')
  const [mode, setMode] = useState<'instant' | 'ai'>('instant')

  const canGenerate = !!(lifestyle && exerciseLevel && primaryGoal && workoutEnvironment)

  function handleGenerate() {
    if (!canGenerate) return
    navigation.navigate('WorkoutPlan', {
      userInput,
      bmiResult: { bmi, evaluation },
      answers: {
        lifestyle,
        exerciseLevel,
        trainingSplit: deriveTrainingSplit(lifestyle, exerciseLevel),
        primaryGoal,
        workoutEnvironment,
        targetTimeline: targetTimeline ?? undefined,
        injuries: injuries !== 'none' ? injuries : undefined,
      },
      mode,
    })
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <View style={s.card} accessibilityRole="header" accessibilityLabel={`Your BMI is ${bmi}, categorized as ${evaluationLabels[evaluation]}`}>
        <Text style={[s.bmiValue, { color }]}>{bmi}</Text>
        <Text style={s.bmiLabel}>Your BMI</Text>
        <View style={[s.badge, { backgroundColor: color + '22' }]}>
          <Text style={[s.badgeText, { color }]}>{evaluationLabels[evaluation]}</Text>
        </View>
      </View>

      <Text style={s.sectionTitle}>Health Insights</Text>
      {recommendations.map((rec, i) => (
        <Card key={i} style={{ marginBottom: 12 }} accessibilityRole="text" accessibilityLabel={`${rec.title}: ${rec.body}`}>
          <View style={s.actionHeader}>
            <Text style={s.actionIcon}>{rec.icon}</Text>
            <Text style={s.actionTitle}>{rec.title}</Text>
          </View>
          <Text style={s.actionBody}>{rec.body}</Text>
        </Card>
      ))}

      <View style={s.divider} />
      <Text style={s.sectionTitle}>Plan Settings</Text>

      <Text style={s.questionLabel}>Lifestyle</Text>
      <View style={s.optionsRow}>
        {lifestyleOptions.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[s.optionCard, lifestyle === opt.value && s.optionCardSelected]}
            onPress={() => setLifestyle(opt.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: lifestyle === opt.value }}
            accessibilityLabel={`${opt.label}: ${opt.desc}`}
          >
            <Text style={[s.optionLabel, lifestyle === opt.value && s.optionLabelSelected]}>{opt.label}</Text>
            <Text style={s.optionDesc}>{opt.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.questionLabel}>Experience Level</Text>
      <View style={s.optionsRow}>
        {exerciseOptions.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[s.optionCard, exerciseLevel === opt.value && s.optionCardSelected]}
            onPress={() => setExerciseLevel(opt.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: exerciseLevel === opt.value }}
            accessibilityLabel={`${opt.label}: ${opt.desc}`}
          >
            <Text style={[s.optionLabel, exerciseLevel === opt.value && s.optionLabelSelected]}>{opt.label}</Text>
            <Text style={s.optionDesc}>{opt.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.questionLabel}>Primary Goal</Text>
      <View style={s.optionsRow}>
        {goalOptions.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[s.optionCard, primaryGoal === opt.value && s.optionCardSelected]}
            onPress={() => setPrimaryGoal(opt.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: primaryGoal === opt.value }}
            accessibilityLabel={`${opt.label}: ${opt.desc}`}
          >
            <Text style={[s.optionLabel, primaryGoal === opt.value && s.optionLabelSelected]}>{opt.label}</Text>
            <Text style={s.optionDesc}>{opt.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.questionLabel}>Equipment Available</Text>
      <View style={s.optionsRow}>
        {environmentOptions.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[s.optionCard, workoutEnvironment === opt.value && s.optionCardSelected]}
            onPress={() => setWorkoutEnvironment(opt.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: workoutEnvironment === opt.value }}
            accessibilityLabel={`${opt.label}: ${opt.desc}`}
          >
            <Text style={[s.optionLabel, workoutEnvironment === opt.value && s.optionLabelSelected]}>{opt.label}</Text>
            <Text style={s.optionDesc}>{opt.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.questionLabel}>Target Timeline <Text style={s.optionalTag}>(optional)</Text></Text>
      <View style={s.chipRow}>
        {timelineOptions.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[s.chip, targetTimeline === opt.value && s.chipSelected]}
            onPress={() => setTargetTimeline(targetTimeline === opt.value ? null : opt.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: targetTimeline === opt.value }}
            accessibilityLabel={`${opt.label} goal`}
          >
            <Text style={[s.chipText, targetTimeline === opt.value && s.chipTextSelected]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={s.questionLabel}>Injuries / Limitations</Text>
      <View style={s.chipRow}>
        {injuryOptions.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[s.chip, injuries === opt.value && s.chipSelected]}
            onPress={() => setInjuries(opt.value)}
            accessibilityRole="radio"
            accessibilityState={{ selected: injuries === opt.value }}
            accessibilityLabel={opt.label}
          >
            <Text style={[s.chipText, injuries === opt.value && s.chipTextSelected]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={s.modeToggle}>
        <TouchableOpacity
          style={[s.modeOption, mode === 'instant' && s.modeOptionActive]}
          onPress={() => setMode('instant')}
        >
          <Text style={[s.modeLabel, mode === 'instant' && s.modeLabelActive]}>Instant</Text>
          <Text style={s.modeDesc}>Built-in science-backed plan</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.modeOption, mode === 'ai' && s.modeOptionActive]}
          onPress={() => setMode('ai')}
        >
          <Text style={[s.modeLabel, mode === 'ai' && s.modeLabelActive]}>AI</Text>
          <Text style={s.modeDesc}>LLM-generated (requires backend)</Text>
        </TouchableOpacity>
      </View>

      <Button
        title={mode === 'instant' ? 'Generate Quick Plan' : 'Generate AI Plan'}
        onPress={handleGenerate}
        disabled={!canGenerate}
        style={{ marginTop: 8, marginBottom: 12 }}
        accessibilityLabel="Generate your personalized workout plan"
      />

      <Button
        title="Re-enter Measurements"
        variant="ghost"
        onPress={() => navigation.goBack()}
        accessibilityLabel="Go back and re-enter your measurements"
      />

      <Button
        title="Detailed Questionnaire →"
        variant="ghost"
        onPress={() => navigation.navigate('Questionnaire', { userInput, bmiResult: { bmi, evaluation } })}
        accessibilityLabel="Open detailed questionnaire"
      />

    </ScrollView>
  )
}

const styles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  content: { padding: 24, paddingTop: 60 },
  card: { alignItems: 'center', marginBottom: 24 },
  bmiValue: { fontSize: 64, fontWeight: '800' },
  bmiLabel: { fontSize: 16, color: t.textSecondary, marginTop: 4 },
  badge: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginTop: 12 },
  badgeText: { fontSize: 16, fontWeight: '700' },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: t.text, marginBottom: 16, marginTop: 8 },
  actionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  actionIcon: { fontSize: 20, marginRight: 10 },
  actionTitle: { fontSize: 16, fontWeight: '700', color: t.text },
  actionBody: { fontSize: 14, color: t.textSecondary, lineHeight: 20 },
  questionLabel: { fontSize: 14, fontWeight: '600', color: t.textSecondary, marginBottom: 8, marginTop: 16 },
  optionsRow: { gap: 8, marginBottom: 4 },
  optionCard: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: 10, padding: 14 },
  optionCardSelected: { borderColor: t.accent, backgroundColor: t.isDark ? '#1C2533' : '#F3EDFF' },
  optionLabel: { fontSize: 15, fontWeight: '700', color: t.text },
  optionLabelSelected: { color: t.accent },
  optionDesc: { fontSize: 12, color: t.textSecondary, marginTop: 3 },
  modeToggle: { flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 4 },
  modeOption: { flex: 1, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: 10, padding: 14, alignItems: 'center' },
  modeOptionActive: { borderColor: t.accent, backgroundColor: t.isDark ? '#1C2533' : '#F3EDFF' },
  modeLabel: { fontSize: 15, fontWeight: '700', color: t.text, marginBottom: 4 },
  modeLabelActive: { color: t.accent },
  modeDesc: { fontSize: 11, color: t.textSecondary, textAlign: 'center' },
  divider: { height: 1, backgroundColor: t.border, marginVertical: 24 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  chip: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8 },
  chipSelected: { borderColor: t.accent, backgroundColor: t.isDark ? '#1C2533' : '#F3EDFF' },
  chipText: { fontSize: 13, fontWeight: '600', color: t.textSecondary },
  chipTextSelected: { color: t.accent },
  optionalTag: { fontSize: 11, fontWeight: '400', color: t.textMuted },
})
