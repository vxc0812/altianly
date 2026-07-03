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