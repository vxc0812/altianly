# Altianly — Architecture & Workflow

## Cloudflare Infrastructure

Three Cloudflare services work together to power the app:

### 1. Cloudflare Pages — `https://044a6f33.altianly.pages.dev/`

Serves the **Expo web build** (`dist/`) as a static site. Configured via `wrangler.jsonc`:

```json
{
  "name": "altianly",
  "compatibility_date": "2026-06-11",
  "assets": { "directory": "./dist" }
}
```

Deployed from the GitHub repo (`vxc0812/altianly`) — every push to `master` triggers a Cloudflare Pages build that runs `npm run web` to produce `dist/`, then serves it.

**What runs here:** The entire React Native (Expo) app rendered for web — BMI calculator, workout plans, settings, history, profile.

### 2. Cloudflare Workers — `https://altianly-ai.vishhalchopra.workers.dev/`

The **AI proxy worker** (`workers/ai-proxy/`). A lightweight edge function that bridges the Expo app to Cloudflare Workers AI.

**Protocol:**

```
POST /
Content-Type: application/json
Body: { "prompt": "...", "model": "@cf/meta/llama-3.2-3b-instruct" }

Response:
{ "response": "..." }
```

**Worker logic:**
1. CORS preflight (OPTIONS → 200 with allow-all headers)
2. Validates POST body has a `prompt`
3. Calls `env.AI.run(modelName, { messages: [{ role: 'user', content: prompt }], max_tokens: 2048, temperature: 0.7 })`
4. Returns `{ response: "..." }` or `{ error: "..." }` on failure

No API key needed — authenticated via the Workers AI binding. Deployed with `npx wrangler deploy` from `workers/ai-proxy/`.

### 3. Cloudflare Dashboard — `https://dash.cloudflare.com/.../altianly-ai/production`

The management console for the **`altianly-ai` worker**. Used to:
- View deployment history and rollback
- Monitor invocation logs and errors
- Configure secrets and environment variables
- Manage the Workers AI binding and quotas

---

## App Workflow

### Entry & Navigation

```
App.tsx
  └─ ThemeProvider (dark/cream theme persisted in AsyncStorage)
       └─ NavigationContainer
            └─ Stack.Navigator (10 screens, headerShown: false, slide_from_right)
```

### Primary Flow: BMI → Result → Workout Plan

```
HomeScreen
  │  User fills: age, gender, height, weight, unit system
  │  Taps "Calculate BMI"
  │
  ▼
  calculateBMI(weightLbs, heightFeet, heightInches)
    → totalInches = (feet × 12) + inches
    → bmi = (weightLbs / totalInches²) × 703
    → evaluation: underweight (<18.5) | normal (18.5–24.9) | overweight (25–29.9) | obese (≥30)
    → BMIHistoryEntry saved to AsyncStorage
    → badges checked/unlocked
  │
  ▼
ResultScreen (params: { userInput })
  │  Shows BMI, evaluation, 3 health insights
  │  User picks: lifestyle, exercise level, training split, goal, experience,
  │  environment, equipment, timeline, injuries
  │  Toggle: Instant (offline) vs AI-generated plan
  │  Taps "Generate Plan"
  │
  ▼
WorkoutPlanScreen (params: { userInput, bmiResult, answers, mode })
  │
  ├── mode === 'instant' ──→ workoutGen.generateWorkoutPlan(params)
  │                            → 75 built-in exercises
  │                            → Rule-based: level → sets/reps/rest
  │                            → Split generator (PPL/Upper-Lower/Full Body/Bro Split)
  │                            → Age-appropriate warmup/cooldown
  │                            → Returns StructuredWorkoutPlan
  │
  └── mode === 'ai' ──→ llm.generateWorkoutPlan(config, params, onStream)
                           → buildPrompt() assembles all user data + questionnaire
                           → Dispatches to provider:
                                Ollama     POST {baseUrl}/api/generate
                                OpenRouter POST {baseUrl}/chat/completions  (Bearer apiKey)
                                HuggingFace POST {baseUrl}/models/{model}   (Bearer apiKey)
                                Cloudflare  POST {baseUrl}                  (no auth)
                           → Streams response token by token
                           → extractStructuredPlan() parses JSON with error recovery
                           → Returns { plan: string, structured?: StructuredWorkoutPlan }
  │
  ▼
  Plan displayed; user taps "Save" → saved to AsyncStorage history
```

### Alternative Flow: with Questionnaire

```
HomeScreen → ResultScreen → QuestionnaireScreen → WorkoutPlanScreen
```

The QuestionnaireScreen asks 14 extended questions (age group, primary goal, timeline, training experience, environment, equipment, workout types, health conditions, injuries, medications, sleep, stress, challenge, motivation, exclusions, progress tracking). These additional fields are included in the AI prompt for a more personalized plan.

### Quick Workout (bypasses BMI form)

```
HomeScreen
  │  Taps "Quick Workout"
  │  Takes last BMI entry from history (or defaults age=30, bmi=22, normal)
  │  Calls generateWorkoutPlan() directly with 'full_body' split
  │  Plan saved to history
  │
  ▼
WorkoutLogScreen (params: { planId, day, focus, exercises })
```

### Start a Split (bypasses BMI form)

```
HomeScreen
  │  Taps "Start a Split"
  │  Modal: pick PPL / Upper-Lower / Full Body / Bro Split
  │  Same flow as Quick Workout but with chosen split
  │
  ▼
WorkoutLogScreen
```

### Side Navigation from Home

```
HomeScreen
  ├── Profile  → ProfileScreen (login/register, profile view, logout)
  ├── Settings → SettingsScreen (LLM provider, model, API key, test connection)
  └── History  → HistoryScreen (BMI chart, activity chart, saved plans)
                    ├── Tap a plan day → WorkoutLogScreen (log sets/reps/weight)
                    └── "View Logs"   → PlanLogsScreen (read-only log history)
```

---

## Data Flow Summary

```
UserInput ──→ calculateBMI() ──→ BMIResult
                                      │
BMIResult + UserInput ──→ QuestionnaireScreen ──→ QuestionnaireAnswers
                                                        │
UserInput + BMIResult + Answers ──→ generateWorkoutPlan()
                                        │
                              ┌─────────┴──────────┐
                              ▼                     ▼
                    workoutGen.ts (instant)   llm.ts (AI)
                    Local, no network         4 providers, streaming
                    Deterministic             Prompt-driven
                              │                     │
                              └─────────┬───────────┘
                                        ▼
                              WorkoutPlan { id, timestamp, structuredPlan, ... }
                                        │
                                        ▼
                              AsyncStorage (altianly_workout_history)
                                        │
                                        ▼
                              HistoryScreen → WorkoutLogScreen
                                              → PlanLogsScreen
```

## Storage Architecture

| Key | Backend | Data |
|-----|---------|------|
| `altianly_workout_history` | AsyncStorage | WorkoutPlan[] (capped 50) |
| `altianly_workout_logs` | AsyncStorage | WorkoutLog[] (capped 200) |
| `altianly_bmi_history` | AsyncStorage | BMIHistoryEntry[] (capped 100) |
| `altianly_badges` | AsyncStorage | Badge[] |
| `altianly_reminder` | AsyncStorage | ReminderConfig |
| `altianly_theme` | AsyncStorage | 'dark' \| 'cream' |
| `altianly_llm_config` | SecureStore/AsyncStorage | LLMConfig (API key) |
| `altianly_user_profile` | SecureStore/AsyncStorage | UserProfile (name, email, password) |

Sensitive data (API keys, user profile) uses `expo-secure-store` with automatic fallback to `AsyncStorage`.

## AI Provider Options

| Provider | Endpoint | Auth | Streaming | Cost |
|----------|----------|------|-----------|------|
| Ollama | `{baseUrl}/api/generate` | None | Yes (SSE) | Free (local) |
| OpenRouter | `{baseUrl}/chat/completions` | API Key | Yes (SSE) | Free tier available |
| HuggingFace | `{baseUrl}/models/{model}` | API Key | Yes (token) | Free tier available |
| Cloudflare | Custom worker URL | None | No (full response) | Free (Workers AI allocation) |

## Theme System

- Two palettes: **Dark** (GitHub-dark inspired) and **Cream** (warm light)
- Persisted in AsyncStorage under `altianly_theme`
- Every screen consumes theme via `const { theme } = useTheme()` and `const s = styles(theme)`
- Background `t.bg`, surfaces `t.surface`, borders `t.border`, accent `t.accent`, text levels `t.text` / `t.textSecondary` / `t.textMuted`
