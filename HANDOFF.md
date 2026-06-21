# Altianly — Session Handoff Document

> **Date:** 2026-06-20
> **Stack:** React Native (Expo SDK 56), TypeScript, AsyncStorage, SecureStore
> **Dev server:** `npm start` → Expo Go or `npm run web` for browser preview

---

## What Was Built This Session

### #1 — Progress Visualization (HistoryScreen)
- **BMI trend chart** — bar chart of last 7 BMI checks, oldest→newest left to right, color-coded by evaluation
- **Workout activity chart** — bar chart of sets completed per session (last 7 sessions)
- **Stats cards** — streak, total checks, latest BMI / sessions logged, avg sets, last focus
- `getWorkoutLogs` fetched alongside BMI history via `Promise.all` in `useFocusEffect`

### #2 — "Resume Latest Plan" Quick-Start Card (HomeScreen)
- Appears on HomeScreen when a structured plan exists in history
- Horizontal scroll of day chips (Day 1 / Day 2 …) each navigating directly to `WorkoutLog`
- Fetches latest plan with `structuredPlan` from workout history on screen focus

### #3 — Wizard-Style Onboarding (ResultScreen)
- Merged Questionnaire into ResultScreen — flow is now: Home → Result → WorkoutPlan (was: Home → Result → Questionnaire → WorkoutPlan)
- `QuestionnaireScreen` still exists in the navigator but is no longer navigated to
- **Auto-derived training split** via `deriveTrainingSplit(lifestyle, exerciseLevel)` — removed from UI:
  - `high` experience → PPL
  - `medium` or `active` lifestyle → Upper/Lower
  - default → Full Body
- **4 new questionnaire questions** added inline to ResultScreen:
  - Primary Goal (5 options: Fat Loss / Build Muscle / Strength / Endurance / General Health)
  - Equipment Available (3 options: No Equipment / Minimal Gear / Full Gym)
  - Target Timeline (optional toggle chips: 4 weeks / 8 weeks / 12 weeks / Long-term)
  - Injuries / Limitations (default: None; toggleable chips)
- **Health Insights** section (Nutrition, Activity, Age-based tip) moved to just below the BMI card — was at the bottom, now gives immediate context before plan settings
- `canGenerate = !!(lifestyle && exerciseLevel && primaryGoal && workoutEnvironment)` — generate button disabled until required fields are filled

### #4 — History → Plan → Log Flow (HistoryScreen)
- Expanding any saved plan now shows day chips if `structuredPlan` exists
- Tapping a chip navigates to `WorkoutLog` with the correct planId, day, focus, and exercises
- Raw text plans (AI plans that failed to parse) still show the plan text
- `View Logs` and `Delete` buttons remain at the bottom of every expanded card

### #5 — LLM Settings UX Polish (SettingsScreen)
- **Default provider changed** to OpenRouter everywhere — `DEFAULT_LLM_CONFIG` in `constants/index.ts` now points to `openrouter`
- **Provider cards** — "Recommended" badge on OpenRouter; description text below the picker updates per provider
- **Model picker (OpenRouter)** — replaces the text input with a tappable button that opens a bottom-sheet modal:
  - Fetches all models live from `https://openrouter.ai/api/v1/models`
  - Splits into **Free Models** and **Paid Models** sections
  - Falls back to 3 hardcoded RECOMMENDED_MODELS if the fetch fails
  - Loaded on Settings open; spinner shown while fetching
- **Model chips (Ollama / HuggingFace)** — unchanged text input + quick-select pills
- **Inline test result** — replaces Alert dialog; green banner on success, red banner with error message on failure
- **API key help text** — shown below the key input for OpenRouter and HuggingFace

### Inline Rest Timer (WorkoutLogScreen)
- Moved from WorkoutPlanScreen (where it did nothing) into each exercise card in WorkoutLogScreen
- Each exercise card has a "Rest Xs" pill button at the bottom
- Active timer shows MM:SS countdown; turns red at ≤10 seconds
- Stop button cancels the timer
- Only one timer can run at a time; starting a new one cancels the previous

### Theme Toggle Moved to HomeScreen
- Sun/moon emoji button added to HomeScreen header (next to Settings link)
- Appearance section removed from SettingsScreen — Settings is now purely for LLM config

### Error Handling Improvements (WorkoutPlanScreen)
- Provider-aware error hints — no longer always shows "Ensure Ollama is running..."
- 429 rate-limit errors show: "This model is rate-limited. Try a different free model in Settings, or wait a moment and retry."
- "Open Settings" button added alongside "Retry" on error state

### Bug Fixes
- `DEFAULT_LLM_CONFIG` was still pointing to Ollama — fixed to OpenRouter
- `{model && ...}`, `{plan && ...}`, `{opt.desc && ...}` string-based `&&` conditions caused "Unexpected text node" warnings in React Native — fixed with `!!` coercion
- LLM not using questionnaire extended fields — `WorkoutPlanScreen` was missing `questionnaire: answers` in the `llmGenerate` call — fixed
- BMI chart rendering newest→oldest — fixed by reversing the slice: `[...bmiHistory.slice(0, 7)].reverse()`
- OpenRouter model fetch not triggering on initial load — `fetchORModels` only fired on provider *change*, not on initial `loaded = true` — fixed with a separate `[loaded]` effect

---

## Current File Map (Modified This Session)

| File | What Changed |
|------|-------------|
| `src/screens/HomeScreen.tsx` | Added "Resume Latest Plan" card, theme toggle, `toggleTheme` import |
| `src/screens/ResultScreen.tsx` | Merged questionnaire, Health Insights moved up, auto-derived split, 4 new questions |
| `src/screens/WorkoutPlanScreen.tsx` | Provider-aware hints, 429 detection, Open Settings button, `questionnaire: answers` fix |
| `src/screens/WorkoutLogScreen.tsx` | Inline rest timer per exercise card |
| `src/screens/HistoryScreen.tsx` | BMI + workout charts, day chips for structured plans, start-day flow |
| `src/screens/SettingsScreen.tsx` | OpenRouter default, model picker modal, inline test result, removed Appearance section |
| `src/screens/QuestionnaireScreen.tsx` | `!!opt.desc` fix |
| `src/constants/index.ts` | `DEFAULT_LLM_CONFIG` → openrouter, `PROVIDER_INFO` desc + recommended, `RECOMMENDED_MODELS`, `API_KEY_HELP` |
| `src/services/workoutGenerator.ts` | Local workout plan generator (instant mode) |
| `src/services/badges.ts` | Badge unlock logic |
| `src/services/notifications.ts` | Daily reminder scheduling |
| `Questionnaire.md` | Updated implementation status tags |

---

## Architecture Notes

### Navigation Flow
```
Home → Result (BMI + questionnaire + health insights) → WorkoutPlan
Home → Settings
Home → History → WorkoutLog (via day chip on any saved plan)
Home → WorkoutLog (via "Resume Latest Plan" quick-start card)
WorkoutLog → PlanLogs
```

### Theme Pattern
```ts
const { theme, mode, toggleTheme } = useTheme()
const s = styles(theme)
// styles = (t: Theme) => StyleSheet.create({ ... })
```

### LLM Generation Modes
- **Instant** — `src/services/workoutGenerator.ts` local rule-based generator, no network
- **AI** — `src/services/llm.ts` streaming call to configured provider; `extractStructuredPlan()` parses JSON from response

### Storage Keys
```ts
altianly_workout_history  // WorkoutPlan[]
altianly_workout_logs     // WorkoutLog[]
altianly_bmi_history      // BMIHistoryEntry[]
altianly_llm_config       // LLMConfig (SecureStore with AsyncStorage fallback)
altianly_badges           // Badge[]
altianly_reminder         // ReminderConfig
altianly_theme            // 'dark' | 'cream'
```

---

## Known Limitations

| Area | Detail |
|------|--------|
| **Daily Reminder on iOS (Expo Go)** | Scheduled background notifications do not fire in Expo Go on iOS. Requires `npx expo run:ios` (development build). Works on Android Expo Go. |
| **OpenRouter free model rate limits** | Free models share an upstream rate-limit pool. If one is 429'd, switching to another free model works immediately. The error message now correctly tells the user this. |
| **AI plan parsing** | The LLM is prompted to return JSON but sometimes returns plain text. `extractStructuredPlan()` in `services/llm.ts` uses a lenient parser. Plans that fail to parse show as raw text in History (no day chips). |
| **Web preview** | `npm run web` works but: notifications disabled, some RNW internal deprecation warnings (`pointerEvents`), `chrome://theme/` browser warnings — all harmless. |

---

## Pending Roadmap Items

### High Priority (next sprint)
| # | Feature | Notes |
|---|---------|-------|
| A | **Micro-interactions + animations** | Staggered card entrance in WorkoutPlanScreen, set-completion pulse in WorkoutLogScreen, haptic feedback via `expo-haptics` |
| B | **One-tap "Mark Set Done"** | Replace typed reps with a checkbox per set; auto-advance to next exercise |
| C | **Native share sheet** | Share workout plan as text via OS share dialog (`Share.share()` from react-native) |

### Medium Priority
| # | Feature | Notes |
|---|---------|-------|
| D | **Badge visibility improvements** | Inline celebration animation when badge unlocked; badge showcase on HomeScreen |
| E | **PlanLogsScreen polish** | Currently minimal; show exercise-level detail per log entry |
| F | **Adaptive AI re-plan** | After logging N sessions, surface a "Re-generate plan based on your logs" button |

### Longer Term (needs backend or native build)
| # | Feature | Notes |
|---|---------|-------|
| G | **Apple Health / Google Fit sync** | HealthKit + Google Fit OAuth; pull steps, HRV |
| H | **Social sharing** | "Share on Instagram Story" with workout overlay |
| I | **Premium subscription** | RevenueCat integration; free tier = 3 AI plans/month |
| J | **SQLite migration** | Replace AsyncStorage with SQLite + TypeORM for relational queries |
| K | **Remote push notifications** | Firebase Cloud Messaging for premium weekly plan reminders |

---

## Running the App

```bash
npm start              # Expo dev server (Expo Go on device)
npm run web            # Browser preview at localhost:8084 (or next available port)
npx expo run:android   # Full native Android build (needed for full notification support)
npx expo run:ios       # Full native iOS build
```

---

*Handoff prepared: 2026-06-20*
