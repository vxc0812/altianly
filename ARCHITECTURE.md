# Altianly — Architecture & Workflow

## Cloudflare Infrastructure

Three Cloudflare services work together to power the app:

### 1. Cloudflare Pages — `https://altianly.com/` (alias: altianly.pages.dev)

Serves the **Expo web build** (`dist/`) as a static site. Configured via `wrangler.jsonc`:

```json
{
  "name": "altianly",
  "compatibility_date": "2026-06-11",
  "assets": { "directory": "./dist" }
}
```

Deployed from the GitHub repo (`vxc0812/altianly`) — **every push to `master` triggers a Cloudflare Pages build** that runs `npm run build` (Expo web export restructured: landing page at `/`, app at `/app/`), then serves `dist/`. No manual deploy step.

**What runs here:** The landing page + the entire React Native (Expo) app rendered for web — dashboard, workout plans, nutrition, settings, history, profile.

### 2. Cloudflare Workers — `https://altianly-ai.vishhalchopra.workers.dev/`

The **API worker** (`workers/ai-proxy/index.js`). An edge function providing auth, food data, and AI proxying. Endpoints:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/auth/password/register` | POST | Register (PBKDF2 hash → KV) |
| `/auth/password/login` | POST | Login, returns session token |
| `/auth/password/reset/request` | POST | Email 6-digit reset code (Resend) |
| `/auth/password/reset/confirm` | POST | Verify code, set new password |
| `/auth/session/:token` | GET | Validate session |
| `/auth/logout` | POST | Invalidate session |
| `/auth/account/delete` | POST | Delete account + all KV data |
| `/food/search` | POST | USDA food search (server-side key) |
| `/food/parse` | POST | NLP meal parse (Workers AI + USDA) |
| `/ai` | POST | LLM proxy → `env.AI.run(...)` |
| `/data`, `/data/:ts` | POST/GET/DELETE | BMI history KV CRUD |

**Bindings & secrets:** `AI` (Workers AI), `ALTIANLY_DATA` (KV), secrets `USDA_API_KEY` + `RESEND_API_KEY`, optional var `RESET_EMAIL_FROM`.

**Deploying:** ⚠️ wrangler resolves the ROOT `wrangler.jsonc` even when run from `workers/ai-proxy/` — always pass the config explicitly:

```bash
npx wrangler deploy --config workers/ai-proxy/wrangler.toml
npx wrangler secret put NAME --config workers/ai-proxy/wrangler.toml
```

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
  └─ ThemeProvider (dark/cream theme persisted in AsyncStorage; cream/light is default)
       └─ NavigationContainer
            └─ Stack.Navigator (root)
                 ├─ Auth  → ProfileScreen as login gate (register / login / guest)
                 ├─ Main  → Bottom Tab Navigator (SVG icons via AppIcon)
                 │           ├─ Home      (dashboard: Today ring, This Week, quick actions)
                 │           ├─ History   ("Workouts" tab: saved plans, logs, graphs)
                 │           ├─ Nutrition (meals, USDA search, barcode, quick add)
                 │           └─ Profile   (account view / signup form)
                 └─ Pushed screens: Result, Questionnaire, WorkoutPlan, Settings,
                    Timer, WorkoutLog, PlanLogs, ConversationalWorkout,
                    HistoryGraph, Habits
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

### Navigation from the Dashboard

```
Home tab (dashboard)
  ├── Today card        → Nutrition tab
  ├── AI Trainer Chat   → ConversationalWorkoutScreen (chat-based plan generation)
  ├── Habits "See All"  → HabitsScreen
  ├── Settings (gear)   → SettingsScreen (LLM provider, model, API key — pure config)
  └── BMI Check         → ResultScreen → WorkoutPlanScreen

Workouts tab (HistoryScreen)
  ├── Graphs link       → HistoryGraphScreen (BMI/weight charts)
  ├── Tap a plan day    → WorkoutLogScreen (log sets/reps/weight)
  └── "View Logs"       → PlanLogsScreen (read-only log history)

Profile tab
  ├── Logged in  → profile view, logout, Delete Account
  └── Guest      → signup/login form, "Forgot password?" reset flow
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
| `altianly_theme` | AsyncStorage | 'dark' \| 'cream' |
| `altianly_llm_config` | SecureStore/AsyncStorage | LLMConfig (API key) |
| `altianly_user_profile` | SecureStore/AsyncStorage | UserProfile (name, email — passwords live only as PBKDF2 hashes in worker KV) |
| `altianly_guest_mode` | AsyncStorage | 'true' when using the app without an account |
| `altianly_last_activity` | AsyncStorage | Session heartbeat timestamp |
| `altianly_meals` | AsyncStorage (web) | Meals keyed by YYYY-MM-DD (native uses SQLite) |

Sensitive data (API keys, user profile) uses `expo-secure-store` with automatic fallback to `AsyncStorage`.

## AI Provider Options

| Provider | Endpoint | Auth | Streaming | Cost |
|----------|----------|------|-----------|------|
| Ollama | `{baseUrl}/api/generate` | None | Yes (SSE) | Free (local) |
| OpenRouter | `{baseUrl}/chat/completions` | API Key | Yes (SSE) | Free tier available |
| HuggingFace | `{baseUrl}/models/{model}` | API Key | Yes (token) | Free tier available |
| Cloudflare | `{baseUrl}/ai` (altianly-ai worker) | None | No (full response) | Free (Workers AI allocation) |

## Theme System

- Two palettes: **Dark** (GitHub-dark inspired) and **Cream** (warm light)
- Persisted in AsyncStorage under `altianly_theme`
- Every screen consumes theme via `const { theme } = useTheme()` and `const s = styles(theme)`
- Background `t.bg`, surfaces `t.surface`, borders `t.border`, accent `t.accent`, text levels `t.text` / `t.textSecondary` / `t.textMuted`
