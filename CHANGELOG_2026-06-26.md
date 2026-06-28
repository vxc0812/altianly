# Changelog — 2026-06-26

**Password security overhaul · 3 files changed**

---

### Password hashing — key stretching & timing safety

`src/services/crypto.ts`

- **Replaced single SHA-256** with 10,000× iterated hashing (PBKDF2-like). Makes brute-force ~10k× slower.
- **Constant-time comparison** (`timingSafeEqual`) eliminates timing side-channel attacks.
- **Unicode normalization** (`NFKC`) on password before hashing to prevent homoglyph bypass.
- **Forward-compatible storage format** `iterations:salt:hash` — iteration count can be increased later without breaking existing hashes.
- **Legacy support:** `verifyPassword` still accepts the old `salt:hash` format (treated as 1 iteration).

### SecureStore — static import + explicit platform guards

`src/services/storage.ts`

- **Static `import * as SecureStore`** replaces dynamic `require()` with silent fallback.
- **Explicit `Platform.OS !== 'web'` guard** with `console.warn` on AsyncStorage fallback (web only).
- **`deleteUserProfile()`** now also calls `clearLastActivity()` — session cleanup is atomic.

### Registration — stronger password policy + live feedback

`src/screens/ProfileScreen.tsx`

- **Minimum length raised:** 4 → 8 characters.
- **Complexity enforced:** requires lowercase + uppercase + digit.
- **Live strength indicator:** progress bar with "Weak" / "Fair" / "Strong" computed from 6 criteria.
- **Requirement checklist:** shows exactly which rules aren't met while typing.
- **Change password** flow also validates against the new policy.
- Removed unused `useRef` import.

---

### QuestionnaireScreen — broken free-text fields fixed

`src/screens/QuestionnaireScreen.tsx`

- **Replaced 4 dead `<Text>` placeholders** with actual `<TextInput>` components (equipment, timeline, health conditions, challenge).
- **Split health+injuries** into two separate inputs instead of a single read-only combined field.
- **Merged input styling** — removed unused `inputContainer` wrapper; `input` style now includes border, background, and padding.
- Added `TextInput` to React Native imports.

---

### ConversationalWorkoutScreen — registered in navigation

`src/types/index.ts` · `App.tsx` · `src/screens/SettingsScreen.tsx`

- **Added `ConversationalWorkout` route** to `RootStackParamList`.
- **Registered screen** in `App.tsx` Stack.Navigator (was unreachable dead code).
- **Added nav link** in Settings under a new "AI Features" section.

---

### AITrainerAgent — provider dispatch, no longer hardcoded to Ollama

`src/services/agent/AITrainerAgent.ts` · `src/screens/ConversationalWorkoutScreen.tsx`

- **`callLLM` now dispatches** to the correct provider (Ollama, OpenRouter, HuggingFace, Cloudflare) based on `llmConfig.provider`, with streaming support for each.
- **`ConversationalWorkoutScreen`** now loads the user's saved LLM config from storage instead of hardcoding Ollama.
- **Theme-aware styling:** replaced hardcoded `dark` palette with `useTheme()`, updated styles to be a `(t: Theme) => StyleSheet.create(...)` function.
- Removed `createDefaultAgent()` helper.

---

### Questionnaire duplication — ResultScreen links to detailed QuestionnaireScreen

`src/screens/ResultScreen.tsx`

- **Added "Detailed Questionnaire →" link** at the bottom of ResultScreen that navigates to the existing `QuestionnaireScreen`.
- Users can now either fill the quick inline form on ResultScreen or tap through to the full detailed questionnaire.
- Added `QuestionnaireAnswers` to import.

---

### workoutGen.ts — removed unused params

`src/services/workoutGen.ts` · `src/screens/HomeScreen.tsx` · `src/screens/WorkoutPlanScreen.tsx`

- Removed unused `gender`, `bmi`, and `evaluation` params from `generateWorkoutPlan()` signature.
- Updated all three callers (HomeScreen quick workout, HomeScreen split start, WorkoutPlanScreen local generation).
- Removed stale variable references (`genderVal`, `bmiVal`, `evalVal`).

---

### ProfileScreen — hardcoded stat replaced

`src/screens/ProfileScreen.tsx`

- Replaced hardcoded `"1"` / `"Profile"` stat card with `"Days Active"` calculated from `profile.createdAt`.

---

### FitnessTrainerPal — removed references to non-existent talents

`src/pals/FitnessTrainerPal.ts`

- Removed `calculate` and `datetime` talent references from `pact.talents` — only `health_data` remains as the sole talent.

---

### Lint/typecheck scripts added

`package.json` · `eslint.config.mjs`

- Added `typecheck` (`tsc --noEmit --skipLibCheck`) and `lint` (`eslint src/`) scripts.
- Installed `eslint@9` and `typescript-eslint`.
- Created flat config with `@typescript-eslint/no-unused-vars` (warn, ignoring `_`-prefixed vars).

---

### Dead code removal: exercises.json + exerciseDb.ts

`src/data/exercises.json` · `src/services/exerciseDb.ts`

- Removed both files — `exerciseDb.ts` had zero imports across the codebase, making both it and its sole dependency `exercises.json` unreachable.

---

### Shared components directory — Button, Card, Input

`src/components/` (new)

- **Button** — themed primary (success), secondary (surface+border), danger, ghost variants; loading spinner, disabled state, accessibility
- **Card** — themed surface container with default (border), selected (accent border), flat (no border) variants
- **Input** — themed TextInput wrapper with label, error message, hint text; forwards all TextInput props
- Barrel export via `src/components/index.ts`

### ResultScreen refactored to use shared components

`src/screens/ResultScreen.tsx`

- Replaced inline `<TouchableOpacity>` primary button with `<Button variant="primary">`
- Replaced inline "Re-enter Measurements" / "Detailed Questionnaire" buttons with `<Button variant="ghost">`
- Replaced inline recommendation `<View>` cards with shared `<Card>`
- Removed ~60 lines of now-unused `actionCard`, `primaryButton*`, `secondaryButton*` styles
- Cleaned up unused `gender` destructure + `QuestionnaireAnswers` import (pre-existing lint warning)

---

### ConversationalWorkoutScreen — added back navigation

`src/screens/ConversationalWorkoutScreen.tsx`

- Added `< Back` button in header that calls `navigation.goBack()`
- Uses `useNavigation()` hook from React Navigation
- Cleaned up console.log in streaming progress callback

---

### Lint cleanup — 24 warnings → 0

Multiple files

- **QuestionnaireScreen:** removed unused imports (`Platform`, `WorkoutType`, `ExcludeExercise`), dead constant arrays (`workoutTypeOptions`, `excludeExerciseOptions`), renamed unused useState setters with `_` prefix
- **HomeScreen:** removed dead `bmiVal` assignment
- **ProfileScreen:** removed unused `clearLastActivity` import
- **AITrainerAgent:** removed unused `DEFAULT_LLM_CONFIG` import, removed unused `llmConfig` destructure
- **SettingsScreen:** typed OpenRouter model fetch response (`{ id: string; name?: string }[]`) instead of `any[]`
- **eslint.config.mjs:** added `varsIgnorePattern: '^_'` for destructured unused vars, disabled `no-explicit-any` and `no-console` (remaining uses are intentional in schema types / platform fallback)

---

## Files changed

| File | Status |
|------|--------|
| `src/services/crypto.ts` | modified |
| `src/services/storage.ts` | modified |
| `src/screens/ProfileScreen.tsx` | modified |
| `src/screens/QuestionnaireScreen.tsx` | modified |
| `src/types/index.ts` | modified |
| `App.tsx` | modified |
| `src/screens/SettingsScreen.tsx` | modified |
| `src/services/agent/AITrainerAgent.ts` | modified |
| `src/screens/ConversationalWorkoutScreen.tsx` | modified |
| `src/screens/ResultScreen.tsx` | modified |
| `src/services/workoutGen.ts` | modified |
| `src/screens/HomeScreen.tsx` | modified |
| `src/screens/WorkoutPlanScreen.tsx` | modified |
| `src/pals/FitnessTrainerPal.ts` | modified |
| `package.json` | modified |
| `eslint.config.mjs` | added |
| `src/data/exercises.json` | removed |
| `src/services/exerciseDb.ts` | removed |
| `src/components/Button.tsx` | added |
| `src/components/Card.tsx` | added |
| `src/components/Input.tsx` | added |
| `src/components/index.ts` | added |
