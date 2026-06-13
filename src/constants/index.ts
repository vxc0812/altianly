import { ExerciseType, ExerciseFocus, Difficulty, Equipment, TrainingSplit } from '../types'

export const BMI_RANGES = {
  underweight: { max: 18.5 },
  normal: { min: 18.5, max: 24.9 },
  overweight: { min: 25, max: 29.9 },
  obese: { min: 30 },
} as const

export const DEFAULT_LLM_CONFIGS = {
  ollama: { provider: 'ollama' as const, baseUrl: 'http://localhost:11434', model: 'llama3.2' },
  openrouter: { provider: 'openrouter' as const, baseUrl: 'https://openrouter.ai/api/v1', model: 'mistralai/mistral-7b-instruct:free' },
  huggingface: { provider: 'huggingface' as const, baseUrl: 'https://api-inference.huggingface.co', model: 'mistralai/Mistral-7B-Instruct-v0.3' },
}

export const DEFAULT_LLM_CONFIG = DEFAULT_LLM_CONFIGS.ollama

export const PROVIDER_INFO = {
  ollama: { label: 'Ollama', needsApiKey: false, needsBaseUrl: true, defaultBaseUrl: 'http://localhost:11434' },
  openrouter: { label: 'OpenRouter', needsApiKey: true, needsBaseUrl: false, defaultBaseUrl: 'https://openrouter.ai/api/v1' },
  huggingface: { label: 'HuggingFace', needsApiKey: true, needsBaseUrl: false, defaultBaseUrl: 'https://api-inference.huggingface.co' },
} as const

export const STORAGE_KEYS = {
  WORKOUT_HISTORY: 'altianly_workout_history',
  LLM_CONFIG: 'altianly_llm_config',
  WORKOUT_LOGS: 'altianly_workout_logs',
} as const

export const EXERCISE_TYPES: ExerciseType[] = ['strength', 'cardio', 'metcon', 'hiit', 'combat', 'stretching', 'wellness', 'yoga']
export const EXERCISE_FOCUSES: ExerciseFocus[] = ['full-body', 'upper-body', 'lower-body', 'abs']
export const DIFFICULTIES: Difficulty[] = ['light', 'easy', 'normal', 'hard', 'advanced']
export const EQUIPMENTS: Equipment[] = ['none', 'dumbbells', 'bar', 'bells', 'barbell', 'weapons', 'ball', 'other']

export const EXERCISE_TYPE_LABELS: Record<ExerciseType, string> = {
  strength: 'Strength', cardio: 'Cardio', metcon: 'Metcon', hiit: 'HIIT',
  combat: 'Combat', stretching: 'Stretching', wellness: 'Wellness', yoga: 'Yoga',
}

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  light: 'Light', easy: 'Easy', normal: 'Normal', hard: 'Hard', advanced: 'Advanced',
}

export const TRAINING_SPLITS: { value: TrainingSplit; label: string; desc: string }[] = [
  { value: 'ppl', label: 'Push/Pull/Legs', desc: '3-day split: Push day, Pull day, Legs day, repeat' },
  { value: 'upper_lower', label: 'Upper/Lower', desc: '4-day split: Upper body, Lower body, Rest, repeat' },
  { value: 'full_body', label: 'Full Body', desc: '3x/week full body workouts each session' },
  { value: 'bro_split', label: 'Bro Split', desc: '5-day: Chest, Back, Shoulders, Arms, Legs' },
]