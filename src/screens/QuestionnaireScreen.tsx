import React, { useState } from 'react'
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RouteProp } from '@react-navigation/native'
import { RootStackParamList, Lifestyle, ExerciseLevel, TrainingSplit, QuestionnaireAnswers, AgeGroup, PrimaryGoal, TrainingExperience, WorkoutEnvironment, WorkoutType, ExcludeExercise, MotivationDriver, ProgressTracking } from '../types'
import { useTheme } from '../context/ThemeContext'
import { TRAINING_SPLITS } from '../constants'
import { Theme } from '../constants/theme'

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Questionnaire'>
  route: RouteProp<RootStackParamList, 'Questionnaire'>
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

const ageGroupOptions: { value: AgeGroup; label: string }[] = [
  { value: 'under18', label: 'Under 18' },
  { value: '18-24', label: '18-24' },
  { value: '25-34', label: '25-34' },
  { value: '35-44', label: '35-44' },
  { value: '45-54', label: '45-54' },
  { value: '55-64', label: '55-64' },
  { value: '65plus', label: '65+' },
]

const primaryGoalOptions: { value: PrimaryGoal; label: string }[] = [
  { value: 'fat_loss', label: 'Fat Loss' },
  { value: 'muscle_gain', label: 'Muscle Building' },
  { value: 'strength', label: 'Strength Training' },
  { value: 'endurance', label: 'Endurance Improvement' },
  { value: 'flexibility', label: 'Flexibility/Mobility' },
  { value: 'health', label: 'General Health' },
  { value: 'event', label: 'Event Training' },
  { value: 'other', label: 'Other' },
]

const trainingExpOptions: { value: TrainingExperience; label: string }[] = [
  { value: 'never', label: 'Never trained' },
  { value: 'occasional', label: 'Occasionally (< 6 months)' },
  { value: 'consistent', label: 'Consistent (6+ months)' },
  { value: 'always_active', label: 'Always active' },
]

const workoutEnvOptions: { value: WorkoutEnvironment; label: string }[] = [
  { value: 'home_none', label: 'Home (bodyweight)' },
  { value: 'home_basic', label: 'Home (basic equipment)' },
  { value: 'gym', label: 'Commercial Gym' },
  { value: 'crossfit', label: 'CrossFit Box' },
  { value: 'outdoor', label: 'Outdoor/Park' },
]

const workoutTypeOptions: { value: WorkoutType; label: string }[] = [
  { value: 'strength', label: 'Strength Training' },
  { value: 'cardio', label: 'Cardio' },
  { value: 'hiit', label: 'HIIT' },
  { value: 'yoga', label: 'Yoga' },
  { value: 'pilates', label: 'Pilates' },
  { value: 'functional', label: 'Functional Fitness' },
  { value: 'sports', label: 'Sports-Specific' },
  { value: 'circuit', label: 'Circuit Training' },
  { value: 'calisthenics', label: 'Calisthenics' },
]

const excludeExerciseOptions: { value: ExcludeExercise; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'cardio', label: 'High-intensity cardio' },
  { value: 'squats', label: 'Squats/Lunges' },
  { value: 'pullups', label: 'Pull-ups/Rows' },
  { value: 'overhead', label: 'Overhead presses' },
  { value: 'other', label: 'Other' },
]

const motivationOptions: { value: MotivationDriver; label: string }[] = [
  { value: 'changes', label: 'Seeing physical changes' },
  { value: 'performance', label: 'Improving performance' },
  { value: 'health', label: 'Health benefits' },
  { value: 'accountability', label: 'Accountability/Social support' },
  { value: 'milestone', label: 'Achieving specific milestones' },
  { value: 'enjoyment', label: 'Enjoyment/Fun' },
]

export default function QuestionnaireScreen({ navigation, route }: Props) {
  const { theme } = useTheme()
  const s = styles(theme)
  const { userInput, bmiResult } = route.params
  
  // Basic questionnaire state
  const [lifestyle, setLifestyle] = useState<Lifestyle | null>(null)
  const [exerciseLevel, setExerciseLevel] = useState<ExerciseLevel | null>(null)
  const [trainingSplit, setTrainingSplit] = useState<TrainingSplit | null>(null)
  const [mode, setMode] = useState<'instant' | 'ai'>('instant')
  
  // Extended questionnaire state
  const [ageGroup, setAgeGroup] = useState<AgeGroup | null>(null)
  const [primaryGoal, setPrimaryGoal] = useState<PrimaryGoal | null>(null)
  const [targetTimeline, setTargetTimeline] = useState<string>('')
  const [trainingExperience, setTrainingExperience] = useState<TrainingExperience | null>(null)
  const [workoutEnvironment, setWorkoutEnvironment] = useState<WorkoutEnvironment | null>(null)
  const [equipment, setEquipment] = useState<string>('')
  const [workoutTypes, setWorkoutTypes] = useState<WorkoutType[]>([])
  const [healthConditions, setHealthConditions] = useState<string>('')
  const [injuries, setInjuries] = useState<string>('')
  const [sleepQuality, setSleepQuality] = useState<string>('good')
  const [stressLevel, setStressLevel] = useState<string>('moderate')
  const [challenge, setChallenge] = useState<string>('')
  const [excludeExercises, setExcludeExercises] = useState<ExcludeExercise[]>(['none'])
  const [motivation, setMotivation] = useState<MotivationDriver | null>(null)
  const [progressTracking, setProgressTracking] = useState<ProgressTracking | null>(null)

  function handleGenerate() {
    if (!lifestyle || !exerciseLevel || !trainingSplit) return
    
    const answers: QuestionnaireAnswers = {
      lifestyle, exerciseLevel, trainingSplit,
      ageGroup: ageGroup || undefined,
      primaryGoal: primaryGoal || undefined,
      targetTimeline,
      trainingExperience: trainingExperience || undefined,
      workoutEnvironment: workoutEnvironment || undefined,
      equipment,
      workoutTypes,
      healthConditions,
      injuries,
      sleepQuality,
      stressLevel,
      challenge,
      excludeExercises,
      motivation: motivation || undefined,
      progressTracking: progressTracking || undefined,
    }
    
    navigation.navigate('WorkoutPlan', { userInput, bmiResult, answers, mode })
  }

  const renderOptionGrid = <T,>(options: { value: T; label: string; desc?: string }[], selected: T | null, onSelect: (v: T) => void) => (
    <View style={s.optionsContainer}>
      {options.map((opt) => (
        <TouchableOpacity
          key={String(opt.value)}
          style={[s.optionCard, selected === opt.value && s.optionCardSelected]}
          onPress={() => onSelect(opt.value)}
        >
          <Text style={[s.optionLabel, selected === opt.value && s.optionLabelSelected]}>{opt.label}</Text>
          {!!opt.desc && <Text style={s.optionDesc}>{opt.desc}</Text>}
        </TouchableOpacity>
      ))}
    </View>
  )

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      <TouchableOpacity onPress={() => navigation.navigate('Home')} style={s.homeLink}>
        <Text style={s.homeLinkText}>Home</Text>
      </TouchableOpacity>
      <Text style={s.heading}>Create Your Workout Plan</Text>

      {/* Basic Questions */}
      <Text style={s.sectionTitle}>Fitness Level</Text>
      {renderOptionGrid(lifestyleOptions, lifestyle, setLifestyle)}

      <Text style={s.sectionTitle}>Exercise Experience</Text>
      {renderOptionGrid(exerciseOptions, exerciseLevel, setExerciseLevel)}

      <Text style={s.sectionTitle}>Training Split</Text>
      <View style={s.optionsContainer}>
        {TRAINING_SPLITS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[s.optionCard, trainingSplit === opt.value && s.optionCardSelected]}
            onPress={() => setTrainingSplit(opt.value)}
          >
            <Text style={[s.optionLabel, trainingSplit === opt.value && s.optionLabelSelected]}>{opt.label}</Text>
            <Text style={s.optionDesc}>{opt.desc}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Extended Questions */}
      <Text style={s.sectionTitle}>Age Group</Text>
      {renderOptionGrid(ageGroupOptions, ageGroup, setAgeGroup)}

      <Text style={s.sectionTitle}>Primary Goal</Text>
      {renderOptionGrid(primaryGoalOptions, primaryGoal, setPrimaryGoal)}

      <Text style={s.sectionTitle}>Training Experience</Text>
      {renderOptionGrid(trainingExpOptions, trainingExperience, setTrainingExperience)}

      <Text style={s.sectionTitle}>Workout Environment</Text>
      {renderOptionGrid(workoutEnvOptions, workoutEnvironment, setWorkoutEnvironment)}

      <Text style={s.sectionTitle}>Equipment Available</Text>
      <Text style={s.inputHint}>e.g., dumbbells, barbell, kettlebells, resistance bands</Text>
      <View style={s.inputContainer}>
        <Text style={s.input}>{equipment || ' '}</Text>
      </View>

      <Text style={s.sectionTitle}>Target Timeline</Text>
      <Text style={s.inputHint}>e.g., "8 weeks", "3 months", "Flexible"</Text>
      <View style={s.inputContainer}>
        <Text style={s.input}>{targetTimeline || ' '}</Text>
      </View>

      <Text style={s.sectionTitle}>Health Considerations</Text>
      <Text style={s.inputHint}>Any conditions, injuries, or limitations (optional)</Text>
      <View style={s.inputContainer}>
        <Text style={s.input}>{healthConditions || injuries || ' '}</Text>
      </View>

      <Text style={s.sectionTitle}>Biggest Challenge</Text>
      <Text style={s.inputHint}>e.g., time, motivation, consistency</Text>
      <View style={s.inputContainer}>
        <Text style={s.input}>{challenge || ' '}</Text>
      </View>

      <Text style={s.sectionTitle}>What motivates you?</Text>
      {renderOptionGrid(motivationOptions, motivation, setMotivation)}

      <Text style={s.sectionTitle}>Generation Mode</Text>
      <View style={s.modeToggle}>
        <TouchableOpacity
          style={[s.modeOption, mode === 'instant' && s.modeOptionActive]}
          onPress={() => setMode('instant')}
        >
          <Text style={[s.modeLabel, mode === 'instant' && s.modeLabelActive]}>Instant</Text>
          <Text style={s.modeDesc}>Built-in plan</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.modeOption, mode === 'ai' && s.modeOptionActive]}
          onPress={() => setMode('ai')}
        >
          <Text style={[s.modeLabel, mode === 'ai' && s.modeLabelActive]}>AI</Text>
          <Text style={s.modeDesc}>LLM-generated</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[s.button, (!lifestyle || !exerciseLevel || !trainingSplit) && s.buttonDisabled]}
        onPress={handleGenerate}
        disabled={!lifestyle || !exerciseLevel || !trainingSplit}
      >
        <Text style={s.buttonText}>{mode === 'instant' ? 'Generate Plan' : 'Generate AI Plan'}</Text>
      </TouchableOpacity>
    </ScrollView>
  )
}

const styles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  content: { padding: 24, paddingTop: 60, paddingBottom: 40 },
  heading: { fontSize: 24, fontWeight: '700', color: t.text, marginBottom: 28 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: t.textSecondary, marginBottom: 10, marginTop: 8 },
  optionsContainer: { gap: 10, marginBottom: 24 },
  optionCard: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: 10, padding: 16 },
  optionCardSelected: { borderColor: t.accent, backgroundColor: t.isDark ? '#1C2533' : '#F3EDFF' },
  optionLabel: { fontSize: 16, fontWeight: '700', color: t.text },
  optionLabelSelected: { color: t.accent },
  optionDesc: { fontSize: 13, color: t.textSecondary, marginTop: 4 },
  homeLink: { alignSelf: 'flex-end', marginBottom: 8 },
  homeLinkText: { color: t.accent, fontSize: 14, fontWeight: '600' },
  modeToggle: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  modeOption: { flex: 1, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: 10, padding: 14, alignItems: 'center' },
  modeOptionActive: { borderColor: t.accent, backgroundColor: t.isDark ? '#1C2533' : '#F3EDFF' },
  modeLabel: { fontSize: 15, fontWeight: '700', color: t.text, marginBottom: 4 },
  modeLabelActive: { color: t.accent },
  modeDesc: { fontSize: 11, color: t.textSecondary, textAlign: 'center' },
  button: { backgroundColor: t.success, padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: t.successText, fontSize: 16, fontWeight: '700' },
  inputContainer: { backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: 10, padding: 12, marginBottom: 16 },
  input: { fontSize: 16, color: t.text, minHeight: 20 },
  inputHint: { fontSize: 12, color: t.textMuted, marginBottom: 4 },
})