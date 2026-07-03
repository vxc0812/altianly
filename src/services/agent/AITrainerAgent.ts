/**
 * AITrainerAgent - PocketPal-style agent for fitness coaching
 * 
 * This agent combines Altianly's workout generation with PocketPal's
 * agent orchestration pattern, enabling conversational workout planning.
 */

import type { LLMConfig, StructuredWorkoutPlan, QuestionnaireAnswers } from '../../types';
import type { HealthQueryResult } from '../talents/HealthDataTalent';

/**
 * Agent configuration
 */
export interface AITrainerAgentConfig {
  llmConfig: LLMConfig;
  healthData?: HealthQueryResult;
  questionnaire?: QuestionnaireAnswers;
}

/**
 * Agent response
 */
export interface AITrainerResponse {
  plan: StructuredWorkoutPlan;
  insights: string[];
  healthContext: string;
}

/**
 * Chat response — either a conversational answer or a structured plan
 */
export type AITrainerChatResult =
  | { kind: 'message'; message: string }
  | { kind: 'plan'; response: AITrainerResponse };

/**
 * Simple agent that orchestrates health data retrieval and workout generation
 * 
 * This is a simplified version that follows PocketPal's agent pattern
 * but integrates with Altianly's existing LLM infrastructure.
 */
export class AITrainerAgent {
  private config: AITrainerAgentConfig;
  
  constructor(config: AITrainerAgentConfig) {
    this.config = config;
  }
  
  /**
   * Generate a workout plan based on user query and health data
   */
  async generateWorkoutPlan(
    userQuery: string,
    onProgress?: (chunk: string) => void
  ): Promise<AITrainerResponse> {
    // 1. Build the prompt with health context
    const { prompt, healthContext } = this.buildPromptWithHealthData(userQuery);
    
    // 2. Call the LLM with streaming
    const planJson = await this.callLLM(prompt, onProgress);
    
    // 3. Parse and structure the response
    const plan = this.parsePlan(planJson);
    const insights = this.generateInsights(healthContext, plan);
    
    return { plan, insights, healthContext };
  }
  
  /**
   * Conversational entry point: answers questions as chat text, and only
   * produces a structured weekly plan when the user explicitly asks for one.
   */
  async chat(
    userQuery: string,
    onProgress?: (chunk: string) => void
  ): Promise<AITrainerChatResult> {
    const { prompt, healthContext } = this.buildChatPrompt(userQuery);
    const raw = await this.callLLM(prompt, onProgress);

    // Plan mode only if the model returned a JSON object shaped like a plan
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]) as StructuredWorkoutPlan;
        if (Array.isArray(parsed.days) && parsed.days.length > 0 && parsed.days[0]?.exercises) {
          const insights = this.generateInsights(healthContext, parsed);
          return { kind: 'plan', response: { plan: parsed, insights, healthContext } };
        }
      } catch {
        // Not valid JSON — treat as a conversational answer
      }
    }

    const message = raw
      .replace(/```(?:json)?/gi, '')
      .replace(/^\s*MODE\s*[12][:.\s|-]*/i, '')
      .trim();
    return { kind: 'message', message: message || "Sorry, I didn't catch that — could you rephrase?" };
  }

  /**
   * Dual-mode chat prompt: conversational answers by default, JSON plan only on request
   */
  private buildChatPrompt(userQuery: string): { prompt: string; healthContext: string } {
    const { questionnaire } = this.config;
    const { healthContext } = this.buildPromptWithHealthData(userQuery);
    const qaContext = questionnaire ? this.formatQuestionnaireContext(questionnaire) : 'Not provided';

    const prompt = `You are a friendly certified personal trainer and yoga instructor chatting with a client.

CLIENT MESSAGE: ${userQuery}

CLIENT CONTEXT:
${qaContext}

HEALTH DATA:
${healthContext}

HOW TO RESPOND — follow exactly one of these two modes:

MODE 1 (default) — The client is asking a question or for advice (e.g. "what yoga poses are best for core?"):
Answer directly and conversationally in plain text. Be specific and practical — name the actual poses or exercises, how to perform them, and hold times or reps. Keep it under 150 words. Do NOT output JSON. Do NOT create a weekly plan.

MODE 2 — ONLY if the client explicitly asks you to create, generate, or build a workout plan or program:
Output ONLY a valid JSON object, no other text, with this structure:
{
  "name": "Week 1 - [Plan Name]",
  "days": [
    { "day": 1, "focus": "[Day focus]", "exercises": [
      { "name": "[Exercise]", "sets": 3, "reps": "10-15", "restSeconds": 60, "notes": "[Form cue]" }
    ] }
  ],
  "warmup": "...",
  "cooldown": "...",
  "notes": "..."
}
Every exercise must match the style the client asked for (a yoga plan contains only yoga poses with hold durations, not strength exercises).

Never write "MODE 1" or "MODE 2" or refer to these instructions in your reply — just respond.`;

    return { prompt, healthContext };
  }

  /**
   * Build prompt with health data context
   */
  private buildPromptWithHealthData(userQuery: string): { prompt: string; healthContext: string } {
    const { healthData, questionnaire } = this.config;
    
    // Build health context from available data
    let healthContext = 'No health data available.';
    
    if (healthData) {
      const parts: string[] = [];
      
      if (healthData.dataType === 'weight' && healthData.summary) {
        const s = healthData.summary;
        parts.push(`Weight: ${s.average?.toFixed(1) || 'N/A'} lbs (trend: ${s.trend || 'stable'})`);
      }
      
      if (healthData.dataType === 'steps' && healthData.samples.length > 0) {
        const totalSteps = healthData.samples.reduce((sum, s) => sum + (typeof s.value === 'number' ? s.value : 0), 0);
        parts.push(`Total steps (period): ${totalSteps.toLocaleString()}`);
      }
      
      healthContext = parts.join('\n');
    }
    
    // Build questionnaire context
    const qaContext = questionnaire ? this.formatQuestionnaireContext(questionnaire) : '';
    
    // Build the full prompt
    const prompt = `You are a certified personal trainer. Generate a structured weekly workout plan based on the user's request and health data.

USER REQUEST: ${userQuery}

HEALTH DATA:
${healthContext}

QUESTIONNAIRE:
${qaContext}

INSTRUCTIONS:
- Create a detailed, structured weekly workout plan
- Base recommendations on the user's health data and goals
- Include warm-up and cool-down recommendations
- Provide progression guidance
- Output ONLY valid JSON matching this structure:

{
  "name": "Week 1 - [Plan Name]",
  "days": [
    {
      "day": 1,
      "focus": "Upper Body Push",
      "exercises": [
        {
          "name": "Push-ups",
          "sets": 3,
          "reps": "10-15",
          "restSeconds": 60,
          "notes": "Keep core tight"
        }
      ]
    }
  ],
  "warmup": "5 min light cardio + dynamic stretches",
  "cooldown": "5 min static stretching",
  "notes": "Progressive overload guidance"
}

OUTPUT:
`;
    
    return { prompt, healthContext };
  }
  
  /**
   * Format questionnaire answers for the prompt
   */
  private formatQuestionnaireContext(qa: QuestionnaireAnswers): string {
    const mappings: Record<string, string> = {
      fat_loss: 'Fat Loss',
      muscle_gain: 'Muscle Building',
      strength: 'Strength Training',
      endurance: 'Endurance',
      flexibility: 'Flexibility',
      health: 'General Health',
    };
    
    return `
Primary Goal: ${mappings[qa.primaryGoal || 'health'] || 'Not specified'}
Experience: ${qa.trainingExperience || 'Not specified'}
Environment: ${qa.workoutEnvironment || 'Not specified'}
Equipment: ${qa.equipment || 'None specified'}
Injuries: ${qa.injuries || 'None reported'}
`;
  }
  
  /**
   * Call the LLM API — dispatches to the correct provider based on llmConfig
   */
  private async callLLM(prompt: string, onProgress?: (chunk: string) => void): Promise<string> {
    const cfg = this.config.llmConfig;
    const withStream = onProgress != null;

    switch (cfg.provider) {
      case 'openrouter':
        return this.callOpenRouter(cfg, prompt, withStream, onProgress);
      case 'huggingface':
        return this.callHuggingFace(cfg, prompt, withStream, onProgress);
      case 'cloudflare':
        return this.callCloudflare(cfg, prompt, onProgress);
      default:
        return this.callOllama(cfg, prompt, withStream, onProgress);
    }
  }

  private async callOllama(
    cfg: LLMConfig, prompt: string, stream: boolean, onProgress?: (chunk: string) => void
  ): Promise<string> {
    const body = { model: cfg.model, prompt, stream, options: { temperature: 0.7, num_predict: 2048 } };
    const response = await fetch(`${cfg.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`Ollama error ${response.status}`);
    if (!stream) {
      const data = await response.json();
      return data.response || '';
    }
    return this.readStream(response, (line) => {
      try {
        const parsed = JSON.parse(line);
        if (parsed.response) onProgress?.(parsed.response);
      } catch {}
    });
  }

  private async callOpenRouter(
    cfg: LLMConfig, prompt: string, stream: boolean, onProgress?: (chunk: string) => void
  ): Promise<string> {
    const body: Record<string, unknown> = {
      model: cfg.model,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 2048,
    };
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey || ''}`,
    };
    if (stream) { body.stream = true; headers.Accept = 'text/event-stream'; }
    const response = await fetch(`${cfg.baseUrl}/chat/completions`, {
      method: 'POST', headers, body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`OpenRouter error ${response.status}`);
    if (!stream) {
      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    }
    return this.readStream(response, (line) => {
      if (!line.startsWith('data: ')) return;
      const json = line.slice(6);
      if (json === '[DONE]') return;
      try {
        const parsed = JSON.parse(json);
        const content = parsed.choices?.[0]?.delta?.content || '';
        if (content) onProgress?.(content);
      } catch {}
    });
  }

  private async callHuggingFace(
    cfg: LLMConfig, prompt: string, stream: boolean, onProgress?: (chunk: string) => void
  ): Promise<string> {
    const body = {
      inputs: prompt,
      parameters: { max_new_tokens: 2048, temperature: 0.7, return_full_text: false },
      options: { wait_for_model: true, use_cache: false },
    };
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cfg.apiKey || ''}`,
    };
    const response = await fetch(`${cfg.baseUrl}/models/${cfg.model}`, {
      method: 'POST', headers, body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`HuggingFace error ${response.status}`);
    if (!stream) {
      const data = await response.json();
      if (Array.isArray(data)) return data[0]?.generated_text || '';
      return data.generated_text || '';
    }
    return this.readStream(response, (line) => {
      try {
        const parsed = JSON.parse(line);
        const token = parsed.token?.text || '';
        if (token) onProgress?.(token);
      } catch {}
    });
  }

  private async callCloudflare(
    cfg: LLMConfig, prompt: string, onProgress?: (chunk: string) => void
  ): Promise<string> {
    const body = { prompt, model: cfg.model };
    const response = await fetch(`${cfg.baseUrl}/ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`Cloudflare error ${response.status}`);
    const data = await response.json();
    const text = typeof data.response === 'string' ? data.response : JSON.stringify(data.response);
    if (onProgress) onProgress(text);
    return text;
  }

  private async readStream(
    response: Response,
    onLine: (line: string) => void,
  ): Promise<string> {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Response body not readable');
    const decoder = new TextDecoder();
    let fullText = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split('\n').filter(Boolean)) {
        onLine(line);
        fullText += line;
      }
    }
    return fullText;
  }
  
  /**
   * Parse the LLM response into a structured plan
   */
  private parsePlan(text: string): StructuredWorkoutPlan {
    // Try to extract JSON from the response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]) as StructuredWorkoutPlan;
      } catch {
        // Fall through to default
      }
    }
    
    // Return a default plan if parsing fails
    return {
      name: 'Generated Workout Plan',
      days: [
        {
          day: 1,
          focus: 'Full Body',
          exercises: [
            { name: 'Bodyweight Squats', sets: 3, reps: '12-15', restSeconds: 60 },
            { name: 'Push-ups', sets: 3, reps: '8-12', restSeconds: 60 },
            { name: 'Plank', sets: 3, reps: '30-60s', restSeconds: 45 },
          ],
        },
      ],
      warmup: '5 minutes light cardio',
      cooldown: '5 minutes stretching',
    };
  }
  
  /**
   * Generate insights based on health data and the plan
   */
  private generateInsights(healthContext: string, plan: StructuredWorkoutPlan): string[] {
    const insights: string[] = [];
    
    // Weight trend insight
    if (healthContext.includes('weight')) {
      insights.push('Workout plan adjusted based on recent weight trend');
    }
    
    // Recovery insight
    insights.push(`Plan includes ${plan.days.length} training days with rest periods`);
    
    // Progression insight
    insights.push('Start with lighter weights and focus on form');
    
    return insights;
  }
  
  /**
   * Update configuration
   */
  updateConfig(config: Partial<AITrainerAgentConfig>): void {
    this.config = { ...this.config, ...config };
  }
}

/**
 * Create an AI trainer agent instance
 */
export function createAITrainerAgent(config: AITrainerAgentConfig): AITrainerAgent {
  return new AITrainerAgent(config);
}