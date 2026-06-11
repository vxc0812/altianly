import { LLMConfig } from '../types'
import { DEFAULT_LLM_CONFIG } from '../constants'

function buildPrompt(params: {
  age: number; gender: string; bmi: number; evaluation: string; lifestyle: string; exerciseLevel: string
}): string {
  return `You are a professional fitness trainer. Given the following user data, create a detailed weekly workout plan.

User Profile:
- Age: ${params.age}
- Gender: ${params.gender}
- BMI: ${params.bmi} (${params.evaluation})
- Lifestyle: ${params.lifestyle}
- Exercise Level: ${params.exerciseLevel}

Provide a structured workout plan with:
1. Weekly schedule (which days to exercise, which to rest)
2. Specific exercises for each day with sets and reps
3. Warm-up and cool-down routines
4. Safety considerations based on BMI and gender
5. Progressive overload suggestions

Format the response in clear sections. Do not use markdown formatting. Use plain text only.`
}

async function callOllama(
  cfg: LLMConfig, prompt: string, onStream?: (chunk: string) => void
): Promise<string> {
  const body = {
    model: cfg.model,
    prompt,
    stream: onStream != null,
    options: { temperature: 0.7, num_predict: 2048 },
  }

  const response = await fetch(`${cfg.baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Ollama error ${response.status}: ${text}`)
  }

  if (!onStream) {
    const data = await response.json()
    return data.response || ''
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('Response body not readable')
  const decoder = new TextDecoder()
  let fullText = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    for (const line of chunk.split('\n').filter(Boolean)) {
      try {
        const parsed = JSON.parse(line)
        if (parsed.response) {
          fullText += parsed.response
          onStream(parsed.response)
        }
      } catch { /* skip malformed lines */ }
    }
  }
  return fullText
}

async function callOpenRouter(
  cfg: LLMConfig, prompt: string, onStream?: (chunk: string) => void
): Promise<string> {
  const body: Record<string, unknown> = {
    model: cfg.model,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 2048,
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${cfg.apiKey || ''}`,
  }

  if (onStream) {
    body.stream = true
    headers.Accept = 'text/event-stream'
  }

  const response = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`OpenRouter error ${response.status}: ${text}`)
  }

  if (!onStream) {
    const data = await response.json()
    return data.choices?.[0]?.message?.content || ''
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('Response body not readable')
  const decoder = new TextDecoder()
  let fullText = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    for (const line of chunk.split('\n').filter(Boolean)) {
      if (!line.startsWith('data: ')) continue
      const json = line.slice(6)
      if (json === '[DONE]') continue
      try {
        const parsed = JSON.parse(json)
        const content = parsed.choices?.[0]?.delta?.content || ''
        if (content) {
          fullText += content
          onStream(content)
        }
      } catch { /* skip malformed lines */ }
    }
  }
  return fullText
}

async function callHuggingFace(
  cfg: LLMConfig, prompt: string, onStream?: (chunk: string) => void
): Promise<string> {
  const body = {
    inputs: prompt,
    parameters: { max_new_tokens: 2048, temperature: 0.7, return_full_text: false },
    options: { wait_for_model: true, use_cache: false },
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${cfg.apiKey || ''}`,
  }

  const response = await fetch(`${cfg.baseUrl}/models/${cfg.model}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`HuggingFace error ${response.status}: ${text}`)
  }

  if (!onStream) {
    const data = await response.json()
    if (Array.isArray(data)) return data[0]?.generated_text || ''
    return data.generated_text || ''
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('Response body not readable')
  const decoder = new TextDecoder()
  let fullText = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const chunk = decoder.decode(value, { stream: true })
    for (const line of chunk.split('\n').filter(Boolean)) {
      try {
        const parsed = JSON.parse(line)
        const token = parsed.token?.text || ''
        if (token) {
          fullText += token
          onStream(token)
        }
      } catch { /* skip malformed lines */ }
    }
  }
  return fullText
}

export async function generateWorkoutPlan(
  config: LLMConfig,
  params: { age: number; gender: string; bmi: number; evaluation: string; lifestyle: string; exerciseLevel: string },
  onStream?: (chunk: string) => void
): Promise<string> {
  const cfg = config || DEFAULT_LLM_CONFIG
  const prompt = buildPrompt(params)

  switch (cfg.provider) {
    case 'openrouter':
      return callOpenRouter(cfg, prompt, onStream)
    case 'huggingface':
      return callHuggingFace(cfg, prompt, onStream)
    default:
      return callOllama(cfg, prompt, onStream)
  }
}

export async function testConnection(config: LLMConfig): Promise<string> {
  const cfg = config
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)

  try {
    switch (cfg.provider) {
      case 'ollama': {
        const res = await fetch(`${cfg.baseUrl}/api/tags`, { signal: controller.signal })
        if (!res.ok) throw new Error(`Status ${res.status}`)
        const data = await res.json()
        const models = data.models?.map((m: { name: string }) => m.name).join(', ') || 'none'
        return `Connected. Available models: ${models}`
      }
      case 'openrouter': {
        const res = await fetch(`${cfg.baseUrl}/models`, {
          signal: controller.signal,
          headers: { Authorization: `Bearer ${cfg.apiKey || ''}` },
        })
        if (!res.ok) throw new Error(`Status ${res.status}`)
        return 'Connected to OpenRouter'
      }
      case 'huggingface': {
        const res = await fetch(`${cfg.baseUrl}/models/${cfg.model}`, {
          signal: controller.signal,
          headers: { Authorization: `Bearer ${cfg.apiKey || ''}` },
        })
        if (!res.ok) throw new Error(`Status ${res.status}`)
        return 'Connected to HuggingFace'
      }
    }
  } finally {
    clearTimeout(timeout)
  }
}
