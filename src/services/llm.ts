import { LLMConfig, StructuredWorkoutPlan } from '../types'
import { DEFAULT_LLM_CONFIG } from '../constants'

function buildPrompt(params: {
  age: number; gender: string; bmi: number; evaluation: string;
  lifestyle: string; exerciseLevel: string; split: string
}): string {
  return `You are a professional fitness trainer. Generate a weekly workout plan as a JSON object. No markdown, no explanation — only valid JSON.

User Profile:
- Age: ${params.age}
- Gender: ${params.gender}
- BMI: ${params.bmi} (${params.evaluation})
- Lifestyle: ${params.lifestyle}
- Experience: ${params.exerciseLevel}
- Training Split: ${params.split}

OUTPUT FORMAT (exactly this structure):
{
  "name": "Week 1 - [Split Name]",
  "days": [
    {
      "day": 1,
      "focus": "Upper Body - Push",
      "exercises": [
        { "name": "Push-ups", "sets": 3, "reps": "10-15", "restSeconds": 60, "notes": "Slow and controlled" }
      ]
    }
  ],
  "warmup": "5 min light cardio + dynamic stretches",
  "cooldown": "5 min static stretching",
  "notes": "Progressive overload guidance"
}

RULES:
1. No equipment needed unless specified.
2. Choose exercises appropriate for their experience level.
3. Include rest days based on the split.
4. Prioritize compound movements.
5. Only output valid JSON — nothing before, nothing after.`
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
  params: {
    age: number; gender: string; bmi: number; evaluation: string;
    lifestyle: string; exerciseLevel: string; split: string
  },
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

export function extractStructuredPlan(text: string): {
  plan: string; structured?: StructuredWorkoutPlan
} {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      if (parsed && parsed.days && Array.isArray(parsed.days)) {
        return { plan: text, structured: parsed as StructuredWorkoutPlan }
      }
    }
  } catch {}
  return { plan: text }
}