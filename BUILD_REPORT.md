# Build Report — Altianly Transformation

> **Date:** 2026-06-17
> **Initiative:** Full app transformation (5 phases)
> **Inspired by:** `altianly_improvement.md`

---

## Phase 1 — Personalized Health Action Cards

### Files changed
- `src/screens/ResultScreen.tsx`

### What was added
- `getRecommendations()` helper that returns 3 cards based on BMI + age:
  - **Nutrition** — diet advice per BMI category (underweight/normal/overweight/obese)
  - **Activity** — exercise recommendations per BMI category
  - **Health Tip** — age-specific advice (<18, 18–30, 30–50, 50+)
- Action cards rendered as styled `View` components with icon, title, and body text
- `UserInput` type imported for recommendation logic

---

## Phase 2 — Progress Tracker & BMI History

### Files changed
- `src/types/index.ts` — added `BMIHistoryEntry` interface
- `src/constants/index.ts` — added `BMI_HISTORY` storage key
- `src/services/storage.ts` — added `saveBMIEntry()`, `getBMIHistory()`
- `src/screens/HomeScreen.tsx` — streak bar (day streak + total checks)
- `src/screens/HistoryScreen.tsx` — BMI history section with chart

### What was added
- **HomeScreen:** Streak counter loads on focus, updates after each calculation. Shows "Day Streak" and "Total Checks"
- **HistoryScreen:** Three new sections above workout plans:
  - Streak card (streak, total checks, latest BMI)
  - Trend chart (last 7 BMI values as colored vertical bars)
  - Recent checks list (last 5 entries with BMI, evaluation, age, gender, date)

### Streak logic
- Counts consecutive unique days from BMI history entries
- Resets on a missed day

---

## Phase 3 — Gamified Badges

### Files added
- `src/services/badges.ts`

### Files changed
- `src/types/index.ts` — added `Badge`, `BadgeDefinition` interfaces
- `src/constants/index.ts` — added `BADGES` storage key
- `src/screens/HomeScreen.tsx` — badge carousel + unlock alerts

### Badge definitions (7)
| ID | Label | Condition |
|----|-------|-----------|
| `first_check` | First Check | 1+ BMI calculation |
| `consistency_3` | Consistency 3× | 3+ different days |
| `streak_7` | Streak Master | 7-day streak |
| `weekly_user` | Weekly Warrior | 7+ total checks |
| `goal_achiever` | Goal Achiever | BMI in normal range |
| `workout_planner` | Workout Planner | 1+ saved workout plan |
| `dedicated_30` | Dedicated | 30+ total checks |

### Behavior
- Badges auto-checked on screen focus and after each BMI calculation
- Newly unlocked badges trigger an `Alert` with details
- Horizontal scrollable row on HomeScreen shows all collected badges

---

## Phase 4 — Reminders & Notifications

### Files added
- `src/services/notifications.ts`

### Files changed
- `App.tsx` — notification handler setup at init
- `src/screens/HomeScreen.tsx` — reminder UI section
- `src/constants/index.ts` — added `REMINDER` storage key
- `package.json` — added `expo-notifications` dependency

### Features
- **Permission handling:** Requests notification permissions on first use
- **Daily reminders:** Schedules repeating notification using `SchedulableTriggerInputTypes.DAILY`
- **Preset times:** 8 AM, 12 PM, 6 PM, 9 PM quick-select buttons
- **Cancel support:** Active reminder shows time + cancel button
- **Android channel:** Creates `altianly-reminders` channel with high importance
- **Persistence:** Reminder config stored in AsyncStorage across app restarts
- **iOS/Android:** Works on both platforms (Android requires channel setup)

---

## Phase 5 — Accessibility Polish

### Files changed
- `src/screens/HomeScreen.tsx`
- `src/screens/ResultScreen.tsx`
- `src/screens/HistoryScreen.tsx`
- `App.tsx`

### Additions per screen

#### HomeScreen
- `accessibilityRole="button"` on Settings, History link, gender cards, unit toggle, reminder buttons, Calculate button
- `accessibilityRole="radio"` with `accessibilityState.selected` on gender picker and unit toggle
- `accessibilityRole="link"` on history link
- `accessibilityLabel` on all TextInputs (age, height feet/inches, cm, weight)
- `accessibilityLabel` on preset reminder buttons and cancel button
- `accessibilityLabel` on streak bar and badge items

#### ResultScreen
- `accessibilityRole="header"` on BMI result card with combined value + evaluation label
- `accessibilityRole="text"` on each action card with title + body
- `accessibilityRole="button"` on Create Workout Plan and Re-enter buttons

#### HistoryScreen
- `accessibilityRole="button"` on back button, plan card headers, View Logs, Delete, Go to Home
- `accessibilityRole="text"` on streak card, chart card, and recent check rows
- Descriptive `accessibilityLabel` on all interactive elements

#### App.tsx
- Fixed import ordering (moved `setupNotificationHandler()` call after all imports)

---

## New dependencies
- `expo-notifications` (~56.0.0) — local notification scheduling

## New files created
```
src/services/badges.ts
src/services/notifications.ts
```

## Types added
| Type | File |
|------|------|
| `BMIHistoryEntry` | `src/types/index.ts` |
| `Badge` | `src/types/index.ts` |
| `BadgeDefinition` | `src/types/index.ts` |
| `ReminderConfig` | `src/services/notifications.ts` |

## Storage keys added
| Key | Purpose |
|-----|---------|
| `altianly_bmi_history` | BMI check history |
| `altianly_badges` | Unlocked badges |
| `altianly_reminder` | Reminder config (hour/minute/enabled) |
