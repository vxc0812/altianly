# Altianly — Project Report

*Generated: June 13, 2026 (Session end — pick up here)*

---

## Executive Summary

Altianly is a privacy-first, offline-capable BMI calculator and AI-powered workout plan generator built with React Native (Expo SDK 56). The app collects anthropometric data (age, gender, height, weight) in either imperial or metric units, calculates BMI, evaluates weight status, and generates personalized workout plans via configurable LLM providers (Ollama, OpenRouter, HuggingFace). All data stays on-device with no account or cloud sync required.

The MVP is functionally complete. Phase 1 foundation features have been delivered, with the notable exception of the exercise database (deprioritized by design decision). The app now supports dual-unit input (imperial/metric), structured workout plans, training split selection, workout logging with actual-vs-planned tracking, a per-exercise rest timer with auto-start, and a history link to access saved plans.

---

## Management Report

### Project Status

| Dimension | Status |
|---|---|
| MVP | ✅ Complete |
| Phase 1 | ✅ 4/6 features delivered (2 deprioritized) |
| Phase 2 | ❌ Not started |
| Active Users | Development-only |
| Release Target | Not set |

### Feature Completion — Phase 1 (Original Plan)

| Feature | Priority | Status | Notes |
|---|---|---|---|
| Structured workout output | P0 | ✅ Delivered | LLM response parsed into structured JSON (days, exercises, sets, reps, rest); renders card-based UI |
| Exercise database | P0 | 🚫 Deprioritized | Decision to not build; LLM generates exercise content on-the-fly |
| Workout logging | P1 | ✅ Delivered | Log actual sets/reps/weight/notes per exercise; compare vs prescribed; view/delete per-plan |
| Training split selection | P1 | ✅ Delivered | User selects PPL, Upper/Lower, Full Body, or Bro Split before generation |
| Session timer | P2 | ✅ Delivered | Rest timer with presets (30/60/90/120s), start/pause/reset; attached per-exercise with auto-start |
| Form feedback videos | P2 | 🚫 Deprioritized | Blocked on exercise DB decision |

### Feature Completion — Beyond Phase 1

| Feature | Phase | Status | Notes |
|---|---|---|---|
| Theme system (dark/cream) | MVP | ✅ Delivered | Full dark (GitHub-dark) and cream (warm light) palettes, persisted |
| BMI calculation | MVP | ✅ Delivered | Imperial formula: `(lbs / in²) × 703` |
| LLM provider selection | MVP | ✅ Delivered | Ollama, OpenRouter, HuggingFace with streaming |
| Connection testing | MVP | ✅ Delivered | Provider-specific health checks |
| History management | MVP | ✅ Delivered | Save/delete/expand workout plans (max 50 entries) |
| Secure API key storage | MVP | ✅ Delivered | expo-secure-store with AsyncStorage fallback |
| Measurement system toggle | Phase 1 | ✅ Delivered | Imperial/metric toggle on HomeScreen; metric values converted to imperial internally; imperial remains default |
| History navigation link | Phase 1 | ✅ Delivered | "View Saved Workouts" link on HomeScreen (was missing — only orphaned styles existed) |
| Lenient JSON parser | Phase 1 | ✅ Delivered | `extractStructuredPlan` handles malformed LLM JSON (extra braces, trailing garbage) w/ 3 fallback parse strategies |

### Key Decisions Log

| Decision | Rationale |
|---|---|
| No exercise database | LLM generates exercises dynamically; avoids maintaining 500+ curated entries |
| AsyncStorage over SQLite | Adequate for current data volume; SQLite deferred until needed |
| Raw fetch over LLM SDKs | Smaller bundle, provider-agnostic, full streaming control |
| react-native-screens@4.24.0 pinned | v4.25+ dropped Paper architecture, broke web compatibility |
| React Context over Zustand/Redux | State complexity is low; Context is adequate |
| Metric conversion at input boundary | Keep BMI calculation pure; all downstream code sees imperial values |

### Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| LLM provider unavailable | Medium | High | 3 providers with easy switching; local Ollama fallback |
| AsyncStorage 6MB limit | Medium (long-term) | Medium | Monitoring in place; SQLite migration path exists |
| Unsafe workout advice | Low | Critical | Prompt guardrails, disclaimers, user warning in app |
| Data loss on uninstall | High | Medium | No accounts; export/import is Phase 2 candidate |

---

## Technical Report

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Client (Expo / RN 0.85)                   │
│                                                             │
│  ┌──────────┐   ┌──────────────┐   ┌────────────────────┐  │
│  │ Home     │──►│ Result       │──►│ Questionnaire      │  │
│  │ (BMI in) │   │ (BMI out)    │   │ (lifestyle +       │  │
│  └──────────┘   └──────────────┘   │  exercise level +  │  │
│       │                            │  training split)   │  │
│       ▼                            └────────┬───────────┘  │
│  ┌──────────┐                                ▼              │
│  │ Settings │◄──────────────────┐  ┌────────────────────┐  │
│  │ (theme + │   ┌──────────┐   │  │ WorkoutPlan        │  │
│  │  LLM)    │   │ History  │◄──┘  │ (streaming LLM +   │  │
│  └──────────┘   │ (saved   │      │  structured cards) │  │
│                 │  plans)  │      └────────┬───────────┘  │
│                 └──────────┘               │              │
│                      │              ┌──────┴──────┐       │
│                      │              │             │       │
│                      ▼              ▼             ▼       │
│                 ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│                 │PlanLogs  │  │WorkoutLog│  │ Timer    │ │
│                 │(per-plan │  │(per-day  │  │(per-ex   │ │
│                 │ log list)│  │ log form)│  │ rest)    │ │
│                 └──────────┘  └──────────┘  └──────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Recent Session (June 13, 2026)

| Change | Files | Description |
|---|---|---|
| Per-exercise rest timer | `WorkoutPlanScreen.tsx`, `TimerScreen.tsx` | Replaced standalone timer button with per-exercise ⏱ button; auto-starts with exercise's `restSeconds` |
| Imperial/metric toggle | `HomeScreen.tsx`, `types/index.ts`, `constants/index.ts` | Unit system toggle; metric→imperial conversion at input boundary; `unitSystem` field on `UserInput` |
| History navigation | `HomeScreen.tsx` | Added "View Saved Workouts" link below header (was missing from JSX) |
| Lenient JSON parsing | `llm.ts` (`extractStructuredPlan`) | 3-strategy fallback: raw parse → `}}]`→`}]` repair → trim to last `{}` pair |
| Report | `REPORT.md` | Updated with session changes |

### Git Log (last 3 commits)

```
ed03fd8  Fix: lenient JSON parser + add history link to HomeScreen
aea3b2f  Add imperial/metric measurement system toggle
bc7b990  Feature D: Workout logging + rest timer attached to exercises
```

### Component Tree

```
<App>
  <ThemeProvider>                     # Dark/cream context, persisted to AsyncStorage
    <NavigationContainer>             # React Navigation 7
      <Stack.Navigator>
        <Stack.Screen name="Home">
          <HomeScreen>               # BMI input form
            <HistoryLink />          # "View Saved Workouts"
            <UnitToggle />           # Imperial / Metric selector
            <ScrollView>             # Gender, Age, Height, Weight inputs
          </HomeScreen>
        </Stack.Screen>
        <Stack.Screen name="Result">
          <ResultScreen>             # BMI display + evaluation
        </Stack.Screen>
        <Stack.Screen name="Questionnaire">
          <QuestionnaireScreen>      # Lifestyle + Exercise Level + Training Split
        </Stack.Screen>
        <Stack.Screen name="WorkoutPlan">
          <WorkoutPlanScreen>        # Streaming LLM, structured plan cards,
                                     # per-exercise timer, Log This Day
        </Stack.Screen>
        <Stack.Screen name="Settings">
          <SettingsScreen>           # Theme toggle, LLM config, test connection
        </Stack.Screen>
        <Stack.Screen name="History">
          <HistoryScreen>            # Saved plans with log counts, expand/collapse
        </Stack.Screen>
        <Stack.Screen name="Timer">
          <TimerScreen>              # Rest timer, auto-starts from exercise
        </Stack.Screen>
        <Stack.Screen name="WorkoutLog">
          <WorkoutLogScreen>         # Per-day workout logging form
        </Stack.Screen>
        <Stack.Screen name="PlanLogs">
          <PlanLogsScreen>           # View/delete logs for a plan
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  </ThemeProvider>
</App>
```

### Data Flow: Workout Generation

```
User Input → BMI Calculation → Questionnaire → LLM Prompt → 
  Stream Response → Structured Plan → Save to History → Log Workouts
```

### Measurement System

The HomeScreen includes an **Imperial / Metric toggle** at the top of the form. Imperial is the default.

| Field | Imperial | Metric |
|---|---|---|
| Height | Feet (1-8) + Inches (0-11) | Centimeters (30-250) |
| Weight | Pounds / lbs (20-1000) | Kilograms / kg (9-450) |

When metric is selected, values are converted to imperial at input time using constants from `src/constants/index.ts` (`CM_PER_INCH = 2.54`, `LBS_PER_KG = 2.20462`). The `UserInput` type stores a `unitSystem` field (`'imperial' \| 'metric'`) so the original unit preference is preserved in saved plans, but all downstream BMI calculations and LLM prompts use the imperial values directly. This keeps the BMI formula unchanged and avoids propagating unit logic through the entire screen tree.

### Navigation Routes (9 screens)

| Route | Params | Purpose |
|---|---|---|
| `Home` | `undefined` | BMI input form (entry point) |
| `Result` | `{ userInput }` | BMI display |
| `Questionnaire` | `{ userInput, bmiResult }` | Lifestyle + split selection |
| `WorkoutPlan` | `{ userInput, bmiResult, answers }` | LLM streaming + structured plan |
| `Settings` | `undefined` | Theme + LLM config |
| `History` | `undefined` | Saved plans with log counts |
| `Timer` | `{ initialSeconds? }` | Rest timer (auto-starts from exercise) |
| `WorkoutLog` | `{ planId, day, focus, exercises }` | Per-day workout log form |
| `PlanLogs` | `{ planId }` | All logs for a plan |

### Services Layer

#### `src/services/bmi.ts`
- **`calculateBMI(weightLbs, heightFeet, heightInches)`** → `{ bmi, evaluation }`
- Formula: `(weightLbs / ((feet×12 + inches)²)) × 703`
- Rounded to 1 decimal

#### `src/services/llm.ts`
- **`generateWorkoutPlan(config, params, onStream?)`** → streams LLM output
- **`testConnection(config)`** → pings provider health endpoint
- **`extractStructuredPlan(text)`** → parses JSON from LLM response; uses 3-strategy fallback to handle malformed output
  - Strategy 1: direct `JSON.parse`
  - Strategy 2: `}}]`→`}]` repair (fixes LLM extra-brace bug)
  - Strategy 3: trim to last balanced `{}` pair
- 3 providers: Ollama (JSON lines), OpenRouter (SSE), HuggingFace (token stream)

#### `src/services/storage.ts`
| Function | Key | Max |
|---|---|---|
| `saveWorkoutPlan` / `getWorkoutHistory` / `deleteWorkoutPlan` | `altianly_workout_history` | 50 |
| `saveWorkoutLog` / `getWorkoutLogs` / `getWorkoutLogsForPlan` / `deleteWorkoutLog` | `altianly_workout_logs` | 200 |
| `saveLLMConfig` / `getLLMConfig` | `altianly_llm_config` | 1 (secure) |

SecureStore used for API keys with AsyncStorage fallback on web.

### Storage Keys

| Key | Store | Purpose |
|---|---|---|
| `altianly_workout_history` | AsyncStorage | Saved workout plans |
| `altianly_workout_logs` | AsyncStorage | Workout log entries |
| `altianly_llm_config` | SecureStore → AsyncStorage | LLM provider configuration |
| `altianly_theme` | AsyncStorage | Theme preference (dark/cream) |

### Theme System

Two palettes, each with 14 semantic color tokens:

| Token | Dark | Cream |
|---|---|---|
| `bg` | `#0D1117` | `#FFF8F0` |
| `surface` | `#161B22` | `#FFFFFF` |
| `border` | `#30363D` | `#E0D6C8` |
| `text` | `#C9D1D9` | `#3D3A36` |
| `textSecondary` | `#8B949E` | `#8C8378` |
| `textMuted` | `#666` | `#B0A89C` |
| `accent` | `#58A6FF` | `#6B4FBC` |
| `success` | `#238636` | `#4CAF50` |
| `danger` | `#F85149` | `#E53935` |
| `warning` | `#D29922` | `#FF8F00` |
| `green` | `#3FB950` | `#388E3C` |
| `inputBg` | `#161B22` | `#FFFFFF` |
| `successText` | `#FFF` | `#FFF` |
| `isDark` | `true` | `false` |

Usage pattern: Each screen defines `styles = (t: Theme) => StyleSheet.create({...})`, called at render via `const s = styles(theme)`.

### Dependencies

**Production (11 packages)**
- Expo SDK ~56.0.9
- React Native 0.85.3 / React 19.2.3
- React Navigation 7 (native-stack)
- AsyncStorage 2.2.0
- expo-secure-store
- react-native-screens 4.24.0 (pinned)

**Dev (2 packages)**
- TypeScript ~6.0.3
- @types/react ~19.2.2

**Zero runtime state management libraries, zero AI/LLM SDKs** — all streaming is raw `fetch`.

### Known Issues

| Issue | Status | Notes |
|---|---|---|
| LLM JSON sometimes malformed | ✅ Fixed | Extra closing braces `}}]` handled by lenient parser |
| History nav missing from HomeScreen | ✅ Fixed | "View Saved Workouts" link added |
| Chrome Private Network Access blocks localhost from HTTPS | 🚫 Unresolved | Browser security feature; use `http://localhost:8081` for dev |

### Technical Debt & Observations

| Item | Severity | Notes |
|---|---|---|
| No unit tests | Medium | All services (bmi, llm, storage) are testable pure functions |
| No error boundaries | Low | Runtime crashes could show white screen |
| AsyncStorage 6MB cap | Low-medium | Current usage is small; SQLite migration path is understood |
| No retry logic on LLM failure | Low | Single retry via manual tap; no exponential backoff |
| react-native-web dependency | Low | Web is secondary target; native is primary |
| exerciseDb.ts unused (dead code) | Low | File exists but is not imported anywhere; safe to remove |
| src/data/exercises.json unused (723KB) | Low | Large file sitting in repo history; should be gitignored |

### Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| LLM provider goes down | Medium | High | 3 providers; easy switching in Settings |
| Streaming failure mid-generation | Medium | Medium | Partial plan still visible; retry button |
| SecureStore unavailable (web) | High | Low | AsyncStorage fallback already in place |
| react-native-screens version conflict | Low | High | Explicitly pinned at 4.24.0 |
| User data loss on uninstall | High | Medium | Optional export/import possible in future |
| LLM outputs malformed JSON | Medium | Medium | Lenient parser now handles; may need more patterns |
| CORS / Private Network Access | Medium | Medium | Use local dev server; configure Ollama origins if deploying |

### Future Phases (Backlog)

**Phase 2 — Intelligence:**
- Progress graphs (volume, strength, consistency over time)
- Personal record auto-detection
- Periodization engine (linear → undulating → block)
- Muscle group balance gauge
- Injury exclusion flags
- Multi-goal support (primary + secondary)
- Session duration tuning (30/45/60/90 min)

**Phase 3 — Offline AI:**
- On-device inference via ONNX Runtime / MLX / llama.cpp
- Quantized 4-bit model (~500MB)
- Exercise recommendation engine
- Optional encrypted cloud sync
- Apple Watch / Wear OS companion

---

## Appendix: TypeScript Types

```typescript
Lifestyle        = 'sedentary' | 'moderate' | 'active'
ExerciseLevel    = 'low' | 'medium' | 'high'
BMIEvaluation    = 'underweight' | 'normal' | 'overweight' | 'obese'
Gender           = 'male' | 'female' | 'other'
TrainingSplit    = 'ppl' | 'upper_lower' | 'full_body' | 'bro_split'
ExerciseType     = 'strength' | 'cardio' | 'metcon' | 'hiit' | 'combat'
                 | 'stretching' | 'wellness' | 'yoga'
ExerciseFocus    = 'full-body' | 'upper-body' | 'lower-body' | 'abs'
Difficulty       = 'light' | 'easy' | 'normal' | 'hard' | 'advanced'
Equipment        = 'none' | 'dumbbells' | 'bar' | 'bells' | 'barbell'
                 | 'weapons' | 'ball' | 'other'

UnitSystem           = 'imperial' | 'metric'
UserInput              { age, gender, unitSystem, heightFeet, heightInches, weightLbs }
BMIResult              { bmi, evaluation }
QuestionnaireAnswers   { lifestyle, exerciseLevel, trainingSplit }
WorkoutPlan            { id, timestamp, userInput, bmiResult, answers, plan, structuredPlan? }
WorkoutLogEntry        { exerciseName, plannedSets, plannedReps, actualSets, actualReps, weight, notes }
WorkoutLog             { id, planId, day, focus, timestamp, entries[] }
WorkoutExercise        { name, slug?, sets, reps, restSeconds, notes? }
WorkoutDay             { day, focus, exercises[] }
StructuredWorkoutPlan  { name, days[], warmup?, cooldown?, notes? }
LLMConfig              { provider, baseUrl, model, apiKey? }
Exercise               { title, slug, image, type, focus, difficulty, equipment }
ExerciseFilters        { types?, focuses?, difficulties?, equipments?, search? }
RootStackParamList     { Home, Result, Questionnaire, WorkoutPlan, Settings,
                         History, Timer, WorkoutLog, PlanLogs }
```

---

## Session Handoff Notes

To continue development:

1. **Run locally:** `npm start` then open `http://localhost:8081`
2. **Ollama** must be running at `localhost:11434` for plan generation
3. **Deployed URL** (`https://altianly.vishhalchopra.workers.dev`) won't connect to local Ollama due to Chrome's Private Network Access restriction
4. **No test suite** exists — services are pure functions ready for Jest tests
5. **Dead code:** `src/services/exerciseDb.ts`, `src/data/exercises.json` (723KB) — safe to delete
6. **Next logical step:** Phase 2 features (progress graphs, PR detection, periodization)

---

*Document version 3.0 — Updated after Session 2 (Feature D + measurement system + fixes)*
