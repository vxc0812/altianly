# PocketPal AI Integration - Quick Start Guide

## Overview

This guide shows how to use the PocketPal AI integration in Altianly to create personalized workout plans based on health data and natural language queries.

## Installation

### 1. Install Health Data Dependencies

```bash
# For iOS (Apple Health)
npx expo install react-native-health

# For Android (Google Health Connect)
npx expo install expo-health-connect
```

### 2. Configure iOS

Add to `app.json`:

```json
{
  "plugins": [
    [
      "react-native-health",
      {
        "permissions": {
          "healthShare": "Allow access to your health data to create personalized workout plans",
          "healthUpdate": "Save workout recommendations to HealthKit"
        }
      }
    ]
  ]
}
```

Add to `ios/{ProjectName}/Info.plist`:

```xml
<key>NSHealthShareUsageDescription</key>
<string>Access your health data to create personalized workout plans</string>
<key>NSHealthUpdateUsageDescription</key>
<string>Save workout recommendations to HealthKit</string>
```

### 3. Configure Android

Add to `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.READ_HEALTH_DATA" />
<uses-permission android:name="android.permission.WRITE_HEALTH_DATA" />
```

## Usage

### Basic Usage

```typescript
import { ConversationalWorkoutScreen } from './src/screens/ConversationalWorkoutScreen';

// In your navigator
<Stack.Screen name="ConversationalWorkout" component={ConversationalWorkoutScreen} />
```

### Programmatic Usage

```typescript
import { AITrainerAgent } from './src/services/agent/AITrainerAgent';
import { HealthDataTalent } from './src/services/talents/HealthDataTalent';

// Create agent with health data
const agent = new AITrainerAgent({
  llmConfig: {
    provider: 'ollama',
    baseUrl: 'http://localhost:11434',
    model: 'llama3.2'
  },
  healthData: {
    dataType: 'weight',
    startDate: '2026-06-01T00:00:00Z',
    endDate: '2026-06-30T23:59:59Z',
    samples: [],
    summary: { average: 175.5, trend: 'decreasing' }
  }
});

// Generate a workout plan
const response = await agent.generateWorkoutPlan(
  "What does my weight look like? Create a workout plan for fat loss."
);

console.log(response.plan);
console.log(response.insights);
```

### Health Data Queries

```typescript
import { HealthDataTalent } from './src/services/talents/HealthDataTalent';

const talent = new HealthDataTalent();

// Query weight data
const weightData = await talent.execute({
  dataType: 'weight',
  startDate: '2026-06-01T00:00:00Z',
  endDate: '2026-06-30T23:59:59Z'
});

// Query sleep data
const sleepData = await talent.execute({
  dataType: 'sleep',
  startDate: '2026-06-01T00:00:00Z',
  endDate: '2026-06-30T23:59:59Z'
});
```

## Example Queries

- "What does my weight look like?"
- "Create a workout plan for muscle gain"
- "Generate a 4-week program for fat loss"
- "What exercises should I do with dumbbells only?"
- "I've been sleeping poorly, what workouts will help?"

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              ConversationalWorkoutScreen                    │
│                    (UI Layer)                             │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│              AITrainerAgent                                 │
│              (Agent Orchestration)                          │
│  - Builds prompts with health context                       │
│  - Calls LLM with streaming support                         │
│  - Parses and structures responses                          │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│              HealthDataTalent                               │
│              (Tool Engine)                                  │
│  - Queries Apple Health / Google Health Connect             │
│  - Returns structured health data                           │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│              LLM (Ollama / OpenRouter / HuggingFace)        │
│              (Workout Generation)                           │
└─────────────────────────────────────────────────────────────┘
```

## Development

### Run Tests

```bash
npm test
```

### Run on Device

```bash
# Start the dev server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

## Next Steps

1. Implement native HealthKit integration
2. Add more health data types
3. Create workout logging features
4. Add periodization support
5. Enable offline model inference

## Troubleshooting

### Health data not available
- Check permissions on device
- Ensure Health app has data
- Verify platform-specific setup

### LLM connection failed
- Verify Ollama is running: `ollama serve`
- Check model is pulled: `ollama pull llama3.2`
- Verify URL in config

## License

MIT - See LICENSE file for details.