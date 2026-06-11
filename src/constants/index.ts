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
} as const
