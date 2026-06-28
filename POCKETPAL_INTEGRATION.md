# PocketPal AI Integration Plan for Altianly

## Executive Summary

This document outlines how to integrate PocketPal AI's on-device AI capabilities with Altianly's fitness application to create a privacy-first, offline-capable workout companion.

**Key Integration Goals:**
1. Use PocketPal's LLM infrastructure for workout plan generation
2. Integrate Apple Health/Google Health data access
3. Create a conversational UI: "What does my weight look like?" → workout plan
4. Maintain Altianly's privacy-first philosophy

---

## 1. PocketPal AI Architecture Analysis

### 1.1 Core Components

| Layer | Component | Purpose | Integration Point |
|-------|-----------|---------|-------------------|
| **UI & Tool Use** | React Native + MobX | State management | Reuse patterns |
| **Agent Runner** | `AgentRunner.ts` | Tool-use orchestration | Workout generation agent |
| **Talents/Tools** | `TalentEngine` | Function calling | Health data tools |
| **LLM Engine** | llama.cpp + GGUF | On-device inference | Local workout models |
| **Bridging** | llama.rn, react-native-speech | Native bridges | HealthKit bridge |

### 1.2 Key Files to Study

```
/src/services/agent/AgentRunner.ts      # Multi-turn tool orchestration
/src/services/talents/                # Tool engines (calculate, datetime, html)
/src/store/ModelStore.ts             # Model management
/src/store/PalStore.ts               # Persona management
/src/utils/completionTypes.ts        # LLM communication types
/src/utils/types.ts                  # Core type definitions
```

### 1.3 Talent Engine Pattern

PocketPal uses a plugin architecture for tools:

```typescript
interface TalentEngine {
  readonly name: string;
  execute(args: Record<string, any>): Promise<TalentResult>;
  toToolDefinition(): ToolDefinition;  // OpenAI tool schema
}
```

**Existing Talents:**
- `calculate` - Math expressions
- `datetime` - Current date/time
- `render_html` - HTML rendering

---

## 2. Altianly Current State

### 2.1 Tech Stack
- **Framework**: Expo SDK 56 / React Native 0.85
- **State**: React Context (needs upgrade for complex state)
- **Storage**: AsyncStorage (6MB limit - migration needed)
- **LLM**: 3-provider support (Ollama, OpenRouter, HuggingFace)

### 2.2 Current Data Flow
```
User Input → BMI Form → Questionnaire → LLM Prompt → Structured JSON → Save
```

### 2.3 Missing Capabilities
- Health data integration
- Local LLM inference (requires network currently)
- Tool-use capabilities
- Persona-driven interactions

---

## 3. Integration Strategy

### 3.1 Phase 1: Health Data Integration

#### 3.1.1 Apple HealthKit

**Library**: `react-native-health` (npm package)

```bash
npm install react-native-health
cd ios && pod install
```

**Required Permissions:**
```xml
<key>NSHealthShareUsageDescription</key>
<string>Access your health data to create personalized workout plans</string>
<key>NSHealthUpdateUsageDescription</key>
<string>Save workout recommendations to HealthKit</string>
```

**Data Types to Access:**
| Type | Identifier | Use in Altianly |
|------|------------|-----------------|
| Weight | `HKQuantityTypeIdentifierBodyMass` | BMI calculation, progress tracking |
| Heart Rate | `HKQuantityTypeIdentifierHeartRate` | Recovery metrics |
| Step Count | `HKQuantityTypeIdentifierStepCount` | Activity level |
| Sleep Analysis | `HKCategoryTypeIdentifierSleepAnalysis` | Recovery recommendations |
| Workouts | `HKWorkoutTypeIdentifier` | Plan generation |

**Implementation Pattern:**
```typescript
// HealthDataManager.ts
import { HeathKitManager } from 'react-native-health';

class HealthDataManager {
  async requestPermissions() { /* ... */ }
  
  async getWeightHistory(): Promise<WeightSample[]> { /* ... */ }
  async getSleepData(): Promise<SleepSummary[]> { /* ... */ }
  async getHealthyWorkoutData(): Promise<Workout[]> { /* ... */ }
}
```

#### 3.1.2 Google Fit / Health Connect (Android)

**Library**: `react-native-health-connect` (Expo plugin)

```bash
npx expo install expo-health-connect
```

---

### 3.2 Phase 2: PocketPal Agent Integration

#### 3.2.1 Create a Fitness Agent

Create a new file: `src/services/AITrainerAgent.ts`

```typescript
import { AgentRunner } from '@pocketpal/ai/agent';
import { talentRegistry } from '@pocketpal/ai/talents';

// Register health data talent
talentRegistry.register(new HealthDataTalent());

export class AITrainerAgent {
  private runner: AgentRunner;
  
  constructor() {
    this.runner = new AgentRunner({
      model: localModel,
      talents: ['health_data', 'calculate', 'datetime']
    });
  }
  
  async generateWorkoutPlan(userQuery: string, healthData: HealthSummary) {
    const prompt = this.buildPrompt(userQuery, healthData);
    return this.runner.run(prompt);
  }
}
```

#### 3.2.2 Health Data Talent

Create: `src/services/talents/HealthDataTalent.ts`

```typescript
import { TalentEngine, TalentResult, ToolDefinition } from './types';

export class HealthDataTalent implements TalentEngine {
  readonly name = 'health_data';
  
  async execute(args: Record<string, any>): Promise<TalentResult> {
    const { dataType, startDate, endDate } = args;
    
    // Call native health data manager
    const data = await HealthDataManager.getInstance().query(dataType, startDate, endDate);
    
    return {
      type: 'text',
      summary: JSON.stringify(data)
    };
  }
  
  toToolDefinition(): ToolDefinition {
    return {
      type: 'function',
      function: {
        name: 'health_data',
        description: 'Query Apple Health or Google Health data',
        parameters: {
          type: 'object',
          properties: {
            dataType: {
              type: 'string',
              enum: ['weight', 'heart_rate', 'steps', 'sleep', 'workouts'],
              description: 'Type of health data to retrieve'
            },
            startDate: { type: 'string', format: 'date-time' },
            endDate: { type: 'string', format: 'date-time' }
          },
          required: ['dataType', 'startDate', 'endDate']
        }
      }
    };
  }
}
```

---

## 4. Implementation Roadmap

### 4.1 Phase 1: Foundation (Weeks 1-2)

| Task | Effort | Dependencies |
|------|--------|--------------|
| Add react-native-health dependency | 1 day | None |
| Implement HealthDataManager (iOS) | 3 days | Native iOS knowledge |
| Implement HealthDataManager (Android) | 3 days | Native Android knowledge |
| Add health permission screens | 1 day | UI work |
| Test health data retrieval | 1 day | Device testing |

### 4.2 Phase 2: Agent Integration (Weeks 3-4)

| Task | Effort | Dependencies |
|------|--------|--------------|
| Study PocketPal AgentRunner patterns | 2 days | Source reading |
| Create AITrainerAgent wrapper | 2 days | PocketPal integration |
| Implement HealthDataTalent | 2 days | HealthDataManager |
| Integrate with existing LLM service | 2 days | Refactor llm.ts |
| Test conversational workout generation | 2 days | End-to-end testing |

### 4.3 Phase 3: UI Enhancement (Weeks 5-6)

| Task | Effort | Dependencies |
|------|--------|--------------|
| Create conversational UI component | 3 days | Voice/text input |
| Implement streaming response display | 2 days | Agent streaming |
| Add health data visualization | 2 days | Chart library |
| Connect to workout plan screen | 3 days | Navigation |
| End-to-end testing | 2 days | Device testing |

---

## 5. Technical Deep Dive: PocketPal Integration

### 5.1 Model Loading Pattern

From `ModelStore.ts`:

```typescript
// Key pattern: Model loading with progress
async downloadModel(model: Model, onProgress: (progress: number) => void) {
  // 1. Create download task
  // 2. Track progress
  // 3. Store in database
  // 4. Update UI
}
```

**For Altianly**: We can use this to:
1. Bundle a small workout-focused model with the app
2. Allow users to download additional models
3. Support both local (PocketPal) and cloud models

### 5.2 Chat Session Management

From `ChatSessionStore.ts`:

```typescript
// Key pattern: Message persistence with metadata
interface AssistantTurn {
  steps: AgentStep[];  // Tool-use steps
  metadata: {
    modelId: string;
    tokensPerSecond: number;
    talentUsage: Record<string, number>;
  };
}
```

**For Altianly**: Adapt for workout plans:
- Each "message" = a workout day
- Tool results = health data insights
- Steps = exercises generated

### 5.3 Pal (Persona) System

From `PalStore.ts`:

```typescript
interface Pal {
  id: string;
  name: string;
  systemPrompt: string;
  model: ModelReference;
  talents: string[];  // Tool names
  parameters: ParameterDefinition[];
}
```

**For Altianly**: Create a "Fitness Trainer" Pal:
- System prompt: "You are a certified personal trainer..."
- Talents: health_data, calculate, datetime
- Parameters: fitness goals, injuries, preferences

---

## 6. Code Modifications Required

### 6.1 New Files

```
src/services/health/
├── HealthDataManager.ts      # Cross-platform health data access
├── HealthDataManager.types.ts
├── HealthDataManager.test.ts

src/services/agent/
├── AITrainerAgent.ts         # PocketPal-style agent for workouts
├── AITrainerAgent.types.ts

src/services/talents/
├── HealthDataTalent.ts       # Health data tool engine
├── HealthDataTalent.test.ts

src/pals/
├── FitnessTrainerPal.ts      # Pre-configured fitness persona
```

### 6.2 Modified Files

```
src/services/llm.ts           # Refactor to use agent pattern
src/store/index.ts            # Add health store
src/screens/QuestionnaireScreen.tsx  # Add health data gathering
src/screens/WorkoutPlanScreen.tsx    # Show health insights
```

---

## 7. Privacy Considerations

### 7.1 Data Flow
```
Apple Health/Google Health
         ↓
   On-Device (Altianly)
         ↓
   Local LLM (PocketPal)
         ↓
   User (Never leaves device)
```

### 7.2 Permissions Model
- Health data: Read-only by default
- Optional: Write workout recommendations back
- Clear permission descriptions in app

### 7.3 Compliance
- HIPAA: Not applicable (no PHI processing)
- GDPR: Minimal data processing
- App Store: HealthKit compliance

---

## 8. Testing Strategy

### 8.1 Unit Tests
- HealthDataManager: Mock native modules
- HealthDataTalent: Test tool definitions
- AITrainerAgent: Test prompt generation

### 8.2 Integration Tests
- Health data flow: iOS Simulator HealthKit
- Agent workflow: Local model inference
- End-to-end: Full conversation flow

### 8.3 Device Tests
- iPhone with Health app data
- Android with Health Connect
- Offline mode verification

---

## 9. Migration Path from Current LLM Service

### 9.1 Current Pattern
```typescript
generateWorkoutPlan(config, params, onStream)
  → callOllama/OpenRouter/HuggingFace
  → return text
```

### 9.2 New Pattern
```typescript
trainerAgent.generatePlan(userQuery, healthData)
  → AgentRunner with health_data talent
  → Structured output with tool results
  → return structured plan + insights
```

### 9.3 Backward Compatibility
- Keep existing `generateWorkoutPlan()` for non-health queries
- New `generatePersonalizedPlan()` for health-integrated plans
- Gradual migration of existing users

---

## 10. Resources

### 10.1 PocketPal Source
- Repository: https://github.com/a-ghorbani/pocketpal-ai
- License: MIT
- Key files:
  - `/src/services/agent/AgentRunner.ts`
  - `/src/services/talents/`
  - `/src/store/PalStore.ts`
  - `/src/utils/types.ts`

### 10.2 Health Integration Libraries
- **iOS**: `react-native-health` (https://github.com/agencyenterprise/react-native-health)
- **Android**: `expo-health-connect` (https://github.com/expo/expo/tree/master/packages/expo-health-connect)

### 10.3 Documentation
- Apple HealthKit: https://developer.apple.com/documentation/healthkit
- Google Health Connect: https://developer.google.com/health/connect
- Expo Health: https://docs.expo.dev/versions/latest/sdk/health/

---

## 11. Success Metrics

| Metric | Current | Target (Phase 1) | Target (Phase 2) |
|--------|---------|------------------|------------------|
| Health data sync rate | 0% | 80% | 95% |
| Personalized plan accuracy | N/A | N/A | 85% user satisfaction |
| Offline capability | 0% | 0% | 100% |
| User retention (7-day) | 45% | 55% | 70% |

---

## 12. Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| HealthKit permission denied | Medium | High | Graceful degradation, clear UX |
| Local model size too large | High | Medium | Use quantized models, progressive download |
| Android Health Connect complexity | Medium | High | Follow official Expo guide, test early |
| PocketPal API changes | Low | Medium | Pin versions, monitor releases |

---

*Document Version: 1.0*
*Last Updated: 2026-06-24*
---

## Implementation Status (Updated: 2026-06-24)

### ✅ Completed Items

| Component | Status | Notes |
|-----------|--------|-------|
| `src/types/pal.ts` | ✅ Created | Pal types matching PocketPal structure |
| `src/services/talents/types.ts` | ✅ Created | TalentEngine interface |
| `src/pals/FitnessTrainerPal.ts` | ✅ Created | Pre-configured fitness persona with health data integration |
| `src/services/talents/HealthDataTalent.ts` | ✅ Created | Health data tool engine with Apple Health/Google Health Connect support |
| `src/services/agent/AITrainerAgent.ts` | ✅ Created | Workout generation agent following PocketPal patterns |
| `src/screens/ConversationalWorkoutScreen.tsx` | ✅ Created | Chat-based UI for workout generation |
| TypeScript compilation | ✅ Passing | All files compile without errors |
| Web build | ✅ Success | Exported dist/ with 560 modules |

### ⏳ In Progress / Pending

| Component | Status | Next Steps |
|-----------|--------|------------|
| `react-native-health` installation | ⏳ Pending | `npm install react-native-health` |
| iOS HealthKit native bridge | ⏳ Pending | iOS native code for HealthKit |
| Android Health Connect bridge | ⏳ Pending | Android native code for Health Connect |
| `src/store/healthStore.ts` | ⏳ Pending | Health data state management |
| Integration tests | ⏳ Pending | Device testing with real health data |
| iOS/Android permission screens | ⏳ Pending | UX for health data access |

### 📊 Build Metrics

- **TypeScript Errors**: 0
- **Build Time**: 6770ms
- **Modules Bundled**: 560
- **Output Size**: 954KB (JS)
