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
  // Optional body-composition measurements (stored in inches). BMI can't tell
  // muscle from fat, so these power the richer Health Snapshot metrics.
  waistInches?: number
  neckInches?: number
  hipInches?: number
}

export interface BMIResult {
  bmi: number
  evaluation: BMIEvaluation
}

// Optional tape-measure inputs used for waist-to-height ratio and the US Navy
// body-fat estimate. All values are in inches.
export interface BodyMeasurements {
  waistInches?: number
  neckInches?: number
  hipInches?: number
}

export type WaistHeightCategory = 'low' | 'healthy' | 'increased' | 'high'
export interface WaistHeightResult {
  ratio: number
  category: WaistHeightCategory
  label: string
}

export type BodyFatCategory = 'essential' | 'athlete' | 'fitness' | 'average' | 'high'
export interface BodyFatResult {
  percent: number
  category: BodyFatCategory
  label: string
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
  workoutChoice?: WorkoutChoice
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
  provider: 'ollama' | 'openrouter' | 'huggingface' | 'cloudflare'
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
  weightLbs: number
  evaluation: BMIEvaluation
  timestamp: number
  age: number
  gender: Gender
  // Optional body-composition snapshot captured alongside the BMI check.
  waistInches?: number
  neckInches?: number
  hipInches?: number
  bodyFatPct?: number
  waistToHeightRatio?: number
}

// One editable wellbeing check-in per day. All fields optional so users can log
// only what they want; stored in AsyncStorage keyed by local YYYY-MM-DD.
export interface DailyCheckin {
  date: string
  mood?: number        // 1 (low) – 5 (great)
  energy?: number      // 1 (drained) – 5 (energized)
  stress?: number      // 1 (calm) – 5 (very stressed)
  sleepHours?: number  // hours slept last night
  waterCups?: number   // cups (8 oz) of water
  note?: string
  updatedAt: number
}

// Composite Health Score — a single 0–100 number blending the signals below.
export interface HealthScoreComponent {
  key: 'bmi' | 'activity' | 'wellbeing' | 'nutrition'
  label: string
  score: number // 0–100
}
export interface HealthScoreResult {
  score: number // 0–100
  label: string
  components: HealthScoreComponent[]
}

export type GraphTimeUnit = 'days' | 'weeks' | 'months' | 'years'
export type GraphMetric = 'bmi' | 'weight' | 'bodyfat' | 'waist'

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

export interface UserProfile {
  name: string
  email: string
  createdAt: number
  lastLoginAt: number
  disclaimerAccepted?: boolean
}

export interface FoodNutrients {
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber?: number
  sugar?: number
  sodium?: number
}

export interface Food {
  id: string
  name: string
  brandName?: string | null
  servingSize?: number | null
  servingUnit?: string | null
  nutrients: FoodNutrients
  // True for user-created custom foods (saved locally and reusable). Custom
  // foods store per-serving nutrients with servingSize 100 / unit 'serving'.
  custom?: boolean
}

export interface MealEntry {
  id: string
  mealId: string
  foodId: string
  foodName: string
  foodBrand?: string | null
  servingSize: number
  servingUnit: string
  servings: number
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
  sugar: number
  sodium: number
  createdAt: number
}

export interface Meal {
  id: string
  date: string
  type: MealType
  entries: MealEntry[]
  createdAt: number
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface RDITarget {
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber: number
}

export interface ParsedFoodItem {
  name: string
  servings: number
  tier: 1 | 2 | 3
  food?: Food | null
  estimatedNutrients?: FoodNutrients | null
}

export type RootStackParamList = {
  Auth: undefined
  Main: undefined
  Home: undefined
  Result: { userInput: UserInput }
  Questionnaire: { userInput: UserInput; bmiResult: BMIResult; workoutChoice?: WorkoutChoice }
  WorkoutPlan: { userInput: UserInput; bmiResult: BMIResult; answers: QuestionnaireAnswers; mode?: 'instant' | 'ai' }
  Settings: undefined
  History: undefined
  Timer: { initialSeconds?: number }
  WorkoutLog: { planId: string; day: number; focus: string; exercises: WorkoutExercise[] }
  PlanLogs: { planId: string }
  Profile: undefined
  ConversationalWorkout: undefined
  HistoryGraph: undefined
  Habits: undefined
  Nutrition: undefined
  Checkin: undefined
}

export type ExerciseType = 'strength' | 'cardio' | 'metcon' | 'hiit' | 'combat' | 'stretching' | 'wellness' | 'yoga'
export type ExerciseFocus = 'full-body' | 'upper-body' | 'lower-body' | 'abs'
export type Difficulty = 'light' | 'easy' | 'normal' | 'hard' | 'advanced'
export type Equipment = 'none' | 'dumbbells' | 'bar' | 'bells' | 'barbell' | 'weapons' | 'ball' | 'other'
export type TrainingSplit = 'ppl' | 'upper_lower' | 'full_body' | 'bro_split'
export type WorkoutChoice = 'hiit' | 'strength' | 'yoga' | 'pilates' | 'gym'

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

export type HabitType = 'yesno' | 'number' | 'time' | 'select'

export interface Habit {
  id: string
  name: string
  type: HabitType
  target?: number
  unit?: string
  options?: string[]
  createdAt: number
  sortOrder: number
}

export interface HabitEntry {
  id: string
  habitId: string
  date: string
  value: string
  skipped: boolean
  notes?: string
  createdAt: number
}