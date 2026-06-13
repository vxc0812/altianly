export type Lifestyle = 'sedentary' | 'moderate' | 'active'
export type ExerciseLevel = 'low' | 'medium' | 'high'
export type BMIEvaluation = 'underweight' | 'normal' | 'overweight' | 'obese'

export type Gender = 'male' | 'female' | 'other'

export interface UserInput {
  age: number
  gender: Gender
  heightFeet: number
  heightInches: number
  weightLbs: number
}

export interface BMIResult {
  bmi: number
  evaluation: BMIEvaluation
}

export interface QuestionnaireAnswers {
  lifestyle: Lifestyle
  exerciseLevel: ExerciseLevel
  trainingSplit: TrainingSplit
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

export type RootStackParamList = {
  Home: undefined
  Result: { userInput: UserInput }
  Questionnaire: { userInput: UserInput; bmiResult: BMIResult }
  WorkoutPlan: { userInput: UserInput; bmiResult: BMIResult; answers: QuestionnaireAnswers }
  Settings: undefined
  History: undefined
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