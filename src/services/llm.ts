import { LLMConfig, StructuredWorkoutPlan, QuestionnaireAnswers } from '../types'
import { DEFAULT_LLM_CONFIG } from '../constants'

function buildPrompt(params: {
  age: number; gender: string; bmi: number; evaluation: string;
  lifestyle: string; exerciseLevel: string; split: string;
  questionnaire?: QuestionnaireAnswers
}): string {
  const qa = params.questionnaire || {} as QuestionnaireAnswers
  
  // Map questionnaire values to readable strings
  const goalText: string = qa.primaryGoal ? {
    fat_loss: 'Fat Loss', muscle_gain: 'Muscle Building', strength: 'Strength Training',
    endurance: 'Endurance Improvement', flexibility: 'Flexibility/Mobility',
    health: 'General Health', event: 'Event Training', other: 'Other'
  }[qa.primaryGoal] : 'Not specified'
  
  const expText: string = qa.trainingExperience ? {
    never: 'Never trained', occasional: 'Occasionally (less than 6 months)',
    consistent: 'Consistent training (6+ months)', always_active: 'Always active'
  }[qa.trainingExperience] : 'Not specified'
  
  const envText: string = qa.workoutEnvironment ? {
    home_none: 'Home (bodyweight only)', home_basic: 'Home (basic equipment)',
    gym: 'Commercial gym', crossfit: 'CrossFit box', outdoor: 'Outdoor/Park'
  }[qa.workoutEnvironment] : 'Not specified'
  
  const equipText: string = qa.equipment || 'Not specified'
  const healthText: string = qa.healthConditions || qa.injuries ? `${qa.healthConditions || 'None'}${qa.injuries ? '; Injuries: ' + qa.injuries : ''}` : 'None reported'
  const timelineText: string = qa.targetTimeline || 'Flexible timeline'
  const challengeText: string = qa.challenge || 'Not specified'
  
  return `You are a professional fitness trainer. Generate a weekly workout plan as a JSON object. No markdown, no explanation — only valid JSON.

User Profile:
- Age: ${params.age}
- Gender: ${params.gender}
- BMI: ${params.bmi} (${params.evaluation})
- Lifestyle: ${params.lifestyle}
- Experience: ${params.exerciseLevel}
- Training Split: ${params.split}

Questionnaire Details:
- Primary Goal: ${goalText}
- Timeline: ${timelineText}
- Training Experience: ${expText}
- Workout Environment: ${envText}
- Equipment Available: ${equipText}
- Health Considerations: ${healthText}
- Biggest Challenge: ${challengeText}

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
1. Choose exercises appropriate for their experience level and equipment availability.
2. Avoid exercises specified as limitations or injuries.
3. Structure rest days based on the training split.
4. Prioritize compound movements.
5. Include modifications for beginners or those with limitations.
6. Only output valid JSON — nothing before, nothing after.`
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

async function callCloudflare(
  cfg: LLMConfig, prompt: string, _onStream?: (chunk: string) => void
): Promise<string> {
  const body = { prompt, model: cfg.model }

  const response = await fetch(cfg.baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Cloudflare AI error ${response.status}: ${text}`)
  }

	const data = await response.json()
	const text = typeof data.response === 'string' ? data.response : JSON.stringify(data.response)
	if (_onStream) _onStream(text)
  return text
}

export async function generateWorkoutPlan(
  config: LLMConfig,
  params: {
    age: number; gender: string; bmi: number; evaluation: string;
    lifestyle: string; exerciseLevel: string; split: string;
    questionnaire?: QuestionnaireAnswers
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
    case 'cloudflare':
      return callCloudflare(cfg, prompt, onStream)
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
      case 'cloudflare': {
        const res = await fetch(cfg.baseUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: 'Respond with: OK', model: cfg.model }),
          signal: controller.signal,
        })
        if (!res.ok) throw new Error(`Status ${res.status}`)
        return 'Connected to Cloudflare AI'
      }
    }
  } finally {
    clearTimeout(timeout)
  }
}

function tryParseJson(text: string): StructuredWorkoutPlan | null {
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return null

  const candidates: string[] = [jsonMatch[0]]

  // Repair 1: }}] -> }] (LLM sometimes adds extra closing brace before array)
  candidates.push(jsonMatch[0].replace(/\}\}\](?=\s*[,}\]])/g, '}]'))

  // Repair 2: trim trailing garbage after last valid brace pair
  const braceMatch = jsonMatch[0].match(/^(\{[\s\S]*\})([\s\S]*)$/)
  if (braceMatch) candidates.push(braceMatch[1])

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate)
      if (parsed?.days && Array.isArray(parsed.days)) {
        return parsed as StructuredWorkoutPlan
      }
    } catch {}
  }
  return null
}

export function extractStructuredPlan(text: string): {
  plan: string; structured?: StructuredWorkoutPlan
} {
  const structured = tryParseJson(text)
  return { plan: text, structured: structured || undefined }
}