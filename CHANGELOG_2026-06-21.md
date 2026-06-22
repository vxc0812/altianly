# Changelog — 2026-06-21

**10 commits · 32 files changed · +4360 / −328**

---

### `f69a3ed` — Dashboard restructure
HomeScreen is now a training hub with Quick Workout, Start a Split, collapsible BMI card, and recent activity.

- HomeScreen converted from pure BMI form to modular dashboard
- Quick Workout button generates full-body plan with one tap → WorkoutLog
- Start a Split modal with PPL / Upper-Lower / Full Body / Bro Split
- BMI Check collapsed by default, expands inline on tap
- Recent Activity section shows last 3 logged workouts
- Streak bar always visible (even at 0)

### `e9ee717` — Fix CI build: unignore `src/data/exercises.ts`
### `a069d0c` — Move `exercises.ts` out of `data/` dir
- Copied `src/data/exercises.ts` → `src/services/exercises.ts`
- Updated import paths; removed old file from tracking
- Updated `.gitignore` to keep only `data/*.json` and `exerciseDb.ts`

### `48e2899` — Inline exercise picker, remove external deps
- Moved `EXERCISES` data array and `pickExercise()` into `workoutGenerator.ts`
- Deleted `src/services/exercises.ts`
- `workoutGenerator.ts` is now fully self-contained

### `98bd505` — Rename `workoutGenerator.ts` → `workoutGen.ts`
- Busts CI cache by using a fresh filename
- Updated imports in `HomeScreen.tsx` and `WorkoutPlanScreen.tsx`

### `6081d60` — Add barrel files for cached import paths
- `src/data/exercises.ts` re-exports `pickExercise` from `workoutGen.ts`
- `src/services/workoutGenerator.ts` re-exports `generateWorkoutPlan`

### `6b0bfbb` — Trigger fresh CI deployment

### `4534861` — Add Cloudflare AI provider with proxy worker
- New `workers/ai-proxy/` with `index.js` and `wrangler.toml`
- Cloudflare provider option in `src/services/llm.ts`

### `738015a` — Fix CORS in AI proxy worker

### `df1a4d3` — Fix Cloudflare response handling + syntax error
- Fixed response parsing in `llm.ts` to handle non-string responses
- Fixed extra `)` syntax error in `_onStream` callback
- Fixed response handling in `workers/ai-proxy/index.js`

---

## Files changed

| File | Status |
|------|--------|
| `.gitignore` | modified |
| `Altianly_Feedback_Report.md` | added |
| `App.tsx` | modified |
| `AppWorkflow.md` | added |
| `BUILD_REPORT.md` | added |
| `HANDOFF.md` | added |
| `Questionnaire.md` | added |
| `ResearchWorkoutQuestionnaire.md` | added |
| `altianly_improvement.md` | added |
| `app.json` | modified |
| `package-lock.json` | modified |
| `package.json` | modified |
| `src/constants/index.ts` | modified |
| `src/data/exercises.ts` | added |
| `src/screens/HistoryScreen.tsx` | modified |
| `src/screens/HomeScreen.tsx` | modified |
| `src/screens/PlanLogsScreen.tsx` | modified |
| `src/screens/QuestionnaireScreen.tsx` | modified |
| `src/screens/ResultScreen.tsx` | modified |
| `src/screens/SettingsScreen.tsx` | modified |
| `src/screens/TimerScreen.tsx` | modified |
| `src/screens/WorkoutLogScreen.tsx` | modified |
| `src/screens/WorkoutPlanScreen.tsx` | modified |
| `src/services/badges.ts` | added |
| `src/services/llm.ts` | modified |
| `src/services/notifications.ts` | added |
| `src/services/storage.ts` | modified |
| `src/services/workoutGen.ts` | added |
| `src/services/workoutGenerator.ts` | added |
| `src/types/index.ts` | modified |
| `workers/ai-proxy/index.js` | added |
| `workers/ai-proxy/wrangler.toml` | added |
