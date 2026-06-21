export type Lifestyle = 'sedentary' | 'moderate' | 'active'
export type ExerciseLevel = 'low' | 'medium' | 'high'
export type BMIEvaluation = 'underweight' | 'normal' | 'overweight' | 'obese'

export type Gender = 'male' | 'female' | 'other'
export type UnitSystem = 'imperial' | 'metric'

export interface UserInput {
  age: number
  gender: Gender
  unitSystem: UnitSystem
  heightFeet: number
  heightInches: number
  weightLbs: number
}

export interface BMIResult {
  bmi: number
  evaluation: BMIEvaluation
}

// Comprehensive questionnaire answers
export type AgeGroup = 'under18' | '18-24' | '25-34' | '35-44' | '45-54' | '55-64' | '65plus'
export type PrimaryGoal = 'fat_loss' | 'muscle_gain' | 'strength' | 'endurance' | 'flexibility' | 'health' | 'event' | 'other'
export type TrainingExperience = 'never' | 'occasional' | 'consistent' | 'always_active'
export type WorkoutEnvironment = 'home_none' | 'home_basic' | 'gym' | 'crossfit' | 'outdoor'
export type WorkoutType = 'strength' | 'cardio' | 'hiit' | 'yoga' | 'pilates' | 'functional' | 'sports' | 'circuit' | 'calisthenics' | 'other'
export type ExcludeExercise = 'none' | 'cardio' | 'squats' | 'lunges' | 'pullups' | 'overhead' | 'other'
export type ProgressTracking = 'scale' | 'performance' | 'clothes' | 'energy' | 'photos' | 'none'
export type MotivationDriver = 'changes' | 'performance' | 'health' | 'accountability' | 'milestone' | 'enjoyment'

export interface QuestionnaireAnswers {
  lifestyle: Lifestyle
  exerciseLevel: ExerciseLevel
  trainingSplit: TrainingSplit
  // Extended questionnaire fields
  ageGroup?: AgeGroup
  primaryGoal?: PrimaryGoal
  targetTimeline?: string
  trainingExperience?: TrainingExperience
  workoutEnvironment?: WorkoutEnvironment
  equipment?: string
  workoutTypes?: WorkoutType[]
  healthConditions?: string
  injuries?: string
  medications?: string
  sleepQuality?: string
  stressLevel?: string
  challenge?: string
  excludeExercises?: ExcludeExercise[]
  motivation?: MotivationDriver
  progressTracking?: ProgressTracking
}

export interface WorkoutPlan {
  id: string
  timestamp: number
  userInput: UserInput
  bmiResult: BMIResult
  answers: QuestionnaireAnswers
  plan: string
  structuredPlan?: StructuredWorkoutPlan
}

export interface LLMConfig {
  provider: 'ollama' | 'openrouter' | 'huggingface'
  baseUrl: string
  model: string
  apiKey?: string
}

export interface Badge {
  id: string
  label: string
  description: string
  icon: string
  unlockedAt: number
}

export interface BadgeDefinition {
  id: string
  label: string
  description: string
  icon: string
}

export interface BMIHistoryEntry {
  bmi: number
  evaluation: BMIEvaluation
  timestamp: number
  age: number
  gender: Gender
}

export interface WorkoutLogEntry {
  exerciseName: string
  plannedSets: number
  plannedReps: string
  actualSets: number
  actualReps: string
  weight: string
  notes: string
}

export interface WorkoutLog {
  id: string
  planId: string
  day: number
  focus: string
  timestamp: number
  entries: WorkoutLogEntry[]
}

export type RootStackParamList = {
  Home: undefined
  Result: { userInput: UserInput }
  Questionnaire: { userInput: UserInput; bmiResult: BMIResult }
  WorkoutPlan: { userInput: UserInput; bmiResult: BMIResult; answers: QuestionnaireAnswers; mode?: 'instant' | 'ai' }
  Settings: undefined
  History: undefined
  Timer: { initialSeconds?: number }
  WorkoutLog: { planId: string; day: number; focus: string; exercises: WorkoutExercise[] }
  PlanLogs: { planId: string }
}

export type ExerciseType = 'strength' | 'cardio' | 'metcon' | 'hiit' | 'combat' | 'stretching' | 'wellness' | 'yoga'
export type ExerciseFocus = 'full-body' | 'upper-body' | 'lower-body' | 'abs'
export type Difficulty = 'light' | 'easy' | 'normal' | 'hard' | 'advanced'
export type Equipment = 'none' | 'dumbbells' | 'bar' | 'bells' | 'barbell' | 'weapons' | 'ball' | 'other'
export type TrainingSplit = 'ppl' | 'upper_lower' | 'full_body' | 'bro_split'

export interface Exercise {
  title: string
  slug: string
  image: string
  type: ExerciseType
  focus: ExerciseFocus
  difficulty: Difficulty
  equipment: Equipment
}

export interface ExerciseFilters {
  types?: ExerciseType[]
  focuses?: ExerciseFocus[]
  difficulties?: Difficulty[]
  equipments?: Equipment[]
  search?: string
}

export interface WorkoutExercise {
  name: string
  slug?: string
  sets: number
  reps: string
  restSeconds: number
  notes?: string
}

export interface WorkoutDay {
  day: number
  focus: string
  exercises: WorkoutExercise[]
}

export interface StructuredWorkoutPlan {
  name: string
  days: WorkoutDay[]
  warmup?: string
  cooldown?: string
  notes?: string
}