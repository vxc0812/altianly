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
}

export interface WorkoutPlan {
  id: string
  timestamp: number
  userInput: UserInput
  bmiResult: BMIResult
  answers: QuestionnaireAnswers
  plan: string
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
