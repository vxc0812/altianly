/**
 * Fitness Trainer Pal - A PocketPal-style persona for Altianly
 * 
 * This defines a fitness trainer persona that can:
 * - Access health data through the health_data talent
 * - Generate personalized workout plans
 * - Provide fitness guidance
 */

import type { Pal, Model } from '../types/pal';

// System prompt template with parameter placeholders
const FITNESS_TRAINER_TEMPLATE = `You are a certified personal trainer with expertise in strength training, 
cardiovascular fitness, and nutrition. You specialize in creating personalized workout plans 
based on individual goals, fitness levels, and health data.

USER PROFILE:
- Name: {{userName}}
- Age: {{age}}
- Gender: {{gender}}
- Fitness Goals: {{primaryGoal}}
- Experience Level: {{experienceLevel}}
- Available Equipment: {{equipment}}
- Injuries/Limitations: {{injuries}}

HEALTH DATA SUMMARY:
Recent weight trend: {{weightTrend}}
Average daily steps: {{avgSteps}}
Sleep quality: {{sleepQuality}}

CURRENT DATE: {{currentDate}}

INSTRUCTIONS:
1. Always prioritize safety - ask about pain or discomfort
2. Progress exercises based on user's experience level
3. Explain the purpose of each exercise
4. Provide alternatives for equipment-limited scenarios
5. Use the health_data tool to retrieve specific metrics when needed
6. Structure responses as JSON workout plans when generating programs

Begin the conversation warmly and assess the user's current fitness level and goals.`;

// Parameter schema for the fitness trainer
export const FITNESS_TRAINER_SCHEMA = [
  {
    key: 'userName',
    type: 'text' as const,
    label: 'Your Name',
    required: true,
    placeholder: 'Enter your name',
    description: 'Your name for personalization',
  },
  {
    key: 'age',
    type: 'text' as const,
    label: 'Age',
    required: true,
    placeholder: '28',
    description: 'Your age for appropriate intensity',
  },
  {
    key: 'gender',
    type: 'select' as const,
    label: 'Gender',
    required: true,
    options: ['Male', 'Female', 'Other', 'Prefer not to say'],
    description: 'Helps tailor recommendations',
  },
  {
    key: 'primaryGoal',
    type: 'select' as const,
    label: 'Primary Fitness Goal',
    required: true,
    options: [
      'Fat Loss',
      'Muscle Building',
      'Strength Training',
      'Endurance Improvement',
      'General Health',
    ],
    description: 'What is your main objective?',
  },
  {
    key: 'experienceLevel',
    type: 'select' as const,
    label: 'Training Experience',
    required: true,
    options: ['Beginner', 'Intermediate', 'Advanced', 'Elite'],
    description: 'How long have you been training?',
  },
  {
    key: 'equipment',
    type: 'text' as const,
    label: 'Available Equipment',
    required: false,
    placeholder: 'Gym, dumbbells, resistance bands',
    description: 'What equipment do you have access to?',
  },
  {
    key: 'injuries',
    type: 'text' as const,
    label: 'Injuries or Limitations',
    required: false,
    placeholder: 'None, or describe any limitations',
    description: 'Any injuries or physical limitations to avoid?',
  },
];

// Default model recommendation (would use a smaller model for mobile)
const DEFAULT_MODEL: Model = {
  id: 'example fitness model',
  author: 'example',
  repo: 'fitness',
  name: 'Fitness-GPT-Q4',
  type: 'llama',
  capabilities: [],
  size: 1000000000, // 1GB
  params: 7000000000, // 7B params
  isDownloaded: false,
  downloadUrl: 'https://example.com/fitness-model.Q4.gguf',
  progress: 0,
  filename: 'fitness-model.Q4.gguf',
  isLocal: false,
  defaultCompletionSettings: {
    temperature: 0.7,
    top_p: 0.9,
    n_predict: 2048,
  },
  completionSettings: {
    temperature: 0.7,
    top_p: 0.9,
    n_predict: 2048,
  },
  defaultStopWords: ['<|endoftext|>'],
  stopWords: ['<|endoftext|>'],
};

/**
 * Creates a Fitness Trainer Pal instance
 * This would be called when the user wants to generate a workout plan
 */
export function createFitnessTrainerPal(): Pal {
  return {
    type: 'local',
    id: 'fitness-trainer-1',
    name: 'Fitness Trainer',
    description: 'Your personal AI fitness coach with access to health data',
    systemPrompt: FITNESS_TRAINER_TEMPLATE,
    isSystemPromptChanged: false,
    useAIPrompt: false,
    defaultModel: DEFAULT_MODEL,
    color: ['#4CAF50', '#8BC34A'], // Green gradient
    capabilities: {
      tools: true, // Has access to talents
      memory: true, // Can remember conversation context
    },
    parameters: {
      userName: 'User',
      age: '28',
      gender: 'Prefer not to say',
      primaryGoal: 'General Health',
      experienceLevel: 'Beginner',
      equipment: 'None',
      injuries: 'None',
    },
    parameterSchema: FITNESS_TRAINER_SCHEMA,
    pact: {
      talents: [
        { name: 'health_data', necessity: 'optional' },
      ],
    },
    greeting: {
      text: "Hi! I'm your AI fitness trainer. I can help you create personalized workout plans based on your goals and health data. What would you like to work on today?",
      suggestedPrompts: [
        "What does my weight look like?",
        "Create a workout plan for muscle gain",
        "Generate a 4-week program for fat loss",
        "What exercises should I do with dumbbells only?",
      ],
    },
    source: 'local',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/**
 * Builds the system prompt with actual user values
 */
export function buildFitnessTrainerPrompt(pal: Pal, overrides: Record<string, any> = {}): string {
  let prompt = FITNESS_TRAINER_TEMPLATE;
  
  // Replace all parameter placeholders
  for (const [key, value] of Object.entries({ ...pal.parameters, ...overrides })) {
    prompt = prompt.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
  }
  
  // Add current date
  prompt = prompt.replace('{{currentDate}}', new Date().toISOString().split('T')[0]);
  
  return prompt;
}