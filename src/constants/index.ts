import { Platform } from 'react-native'
import { ExerciseType, ExerciseFocus, Difficulty, Equipment, TrainingSplit } from '../types'

export const BMI_RANGES = {
  underweight: { max: 18.5 },
  normal: { min: 18.5, max: 24.9 },
  overweight: { min: 25, max: 29.9 },
  obese: { min: 30 },
} as const

export const DEFAULT_LLM_CONFIGS = {
  ollama: { provider: 'ollama' as const, baseUrl: 'http://localhost:11434', model: 'llama3.2' },
  openrouter: { provider: 'openrouter' as const, baseUrl: 'https://openrouter.ai/api/v1', model: 'openrouter/free' },
  huggingface: { provider: 'huggingface' as const, baseUrl: 'https://api-inference.huggingface.co', model: 'mistralai/Mistral-7B-Instruct-v0.3' },
  cloudflare: { provider: 'cloudflare' as const, baseUrl: 'https://altianly-ai.vishhalchopra.workers.dev', model: '@cf/meta/llama-3.2-3b-instruct' },
}

export const DEFAULT_LLM_CONFIG = DEFAULT_LLM_CONFIGS.cloudflare

export const PROVIDER_INFO = {
  ollama: {
    label: 'Ollama',
    desc: 'Run AI locally on your machine. Completely free but requires Ollama installed and running.',
    needsApiKey: false,
    needsBaseUrl: true,
    defaultBaseUrl: 'http://localhost:11434',
    recommended: false,
  },
  openrouter: {
    label: 'OpenRouter',
    desc: 'Cloud AI with a free tier. Sign up, grab an API key, and you\'re done.',
    needsApiKey: true,
    needsBaseUrl: false,
    defaultBaseUrl: 'https://openrouter.ai/api/v1',
    recommended: false,
  },
  huggingface: {
    label: 'HuggingFace',
    desc: 'Open-source models via the Hugging Face Inference API. Free tier available.',
    needsApiKey: true,
    needsBaseUrl: false,
    defaultBaseUrl: 'https://api-inference.huggingface.co',
    recommended: false,
  },
  cloudflare: {
    label: 'Cloudflare AI',
    desc: 'AI via your Cloudflare Worker. Free, no API key needed — deploy with `npx wrangler deploy` from workers/ai-proxy.',
    needsApiKey: false,
    needsBaseUrl: true,
    defaultBaseUrl: 'https://altianly-ai.vishhalchopra.workers.dev',
    recommended: true,
  },
} as const

export const RECOMMENDED_MODELS: Record<'ollama' | 'openrouter' | 'huggingface' | 'cloudflare', { id: string; label: string }[]> = {
  openrouter: [
    { id: 'openrouter/free', label: 'Auto-select free model' },
    { id: 'google/gemma-4-31b-it:free', label: 'Gemma 4 31B (free)' },
    { id: 'meta-llama/llama-3.2-3b-instruct:free', label: 'Llama 3.2 3B (free)' },
  ],
  ollama: [
    { id: 'llama3.2', label: 'Llama 3.2' },
    { id: 'mistral', label: 'Mistral' },
    { id: 'gemma2', label: 'Gemma 2' },
  ],
  huggingface: [
    { id: 'mistralai/Mistral-7B-Instruct-v0.3', label: 'Mistral 7B' },
    { id: 'HuggingFaceH4/zephyr-7b-beta', label: 'Zephyr 7B' },
  ],
  cloudflare: [
    { id: '@cf/meta/llama-3.2-3b-instruct', label: 'Llama 3.2 3B' },
    { id: '@cf/meta/llama-3-8b-instruct', label: 'Llama 3 8B' },
    { id: '@cf/mistral/mistral-7b-instruct-v0.1', label: 'Mistral 7B' },
  ],
}

export const API_KEY_HELP: Partial<Record<'ollama' | 'openrouter' | 'huggingface' | 'cloudflare', string>> = {
  openrouter: 'Get a free API key at openrouter.ai → Keys',
  huggingface: 'Get a free token at huggingface.co → Settings → Access Tokens',
}

export const CM_PER_INCH = 2.54
export const LBS_PER_KG = 2.20462

export const SESSION_DURATION_MS = 10 * 60 * 60 * 1000

export const STORAGE_KEYS = {
  WORKOUT_HISTORY: 'altianly_workout_history',
  LLM_CONFIG: 'altianly_llm_config',
  WORKOUT_LOGS: 'altianly_workout_logs',
  BMI_HISTORY: 'altianly_bmi_history',
  BADGES: 'altianly_badges',
  USER_PROFILE: 'altianly_user_profile',
  LAST_ACTIVITY: 'altianly_last_activity',
  GUEST_MODE: 'altianly_guest_mode',
  CHECKINS: 'altianly_checkins',
  CUSTOM_FOODS: 'altianly_custom_foods',
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

export const WORKOUT_CHOICES: { value: import('../types').WorkoutChoice; label: string; icon: string; desc: string }[] = [
  { value: 'hiit', label: 'HIIT', icon: '🔥', desc: 'High intensity, bodyweight circuits, timed intervals' },
  { value: 'strength', label: 'Strength', icon: '💪', desc: 'Progressive overload, compound movements' },
  { value: 'yoga', label: 'Yoga', icon: '🧘', desc: 'Poses, flows, flexibility & breath work' },
  { value: 'pilates', label: 'Pilates', icon: '🎯', desc: 'Core strength, control, mat exercises' },
  { value: 'gym', label: 'Gym', icon: '🏋️', desc: 'Full gym equipment — barbells, dumbbells, machines' },
]

export const FONT_MONO = Platform.OS === 'web'
  ? "'JetBrains Mono', 'IBM Plex Mono', ui-monospace, Menlo, monospace"
  : Platform.OS === 'ios'
    ? 'Menlo'
    : 'monospace'