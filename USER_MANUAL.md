# Altianly — User Manual

> **Version:** Phase 1 (BMI + Workout Plans + Habits)  
> **Last updated:** June 2026

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [BMI Calculator](#2-bmi-calculator)
3. [Personalized Workout Plans](#3-personalized-workout-plans)
4. [Habit Tracking (Phase 1)](#4-habit-tracking-phase-1)
5. [Settings & Configuration](#5-settings--configuration)
6. [Coming in Future Phases](#6-coming-in-future-phases)

---

## 1. Getting Started

### Launch the app

```bash
npm start
```

Press `w` for web, `a` for Android, or `i` for iOS.

### Landing page

When you first open Altianly, you'll see a landing page with a hero section and three feature cards (AI Plans, BMI & Progress, Workout Logging). No sign-up required — just enter your measurements to get started.

If you've signed up with a passkey on web, you can log back in to see your profile stats.

### Theme toggle

Tap **Settings** (gear icon in top-right of Home) → toggle between **Dark** and **Cream** themes. Your preference is saved automatically.

---

## 2. BMI Calculator

### How it works

1. From the **Home** screen, enter:
   - **Gender** — Male / Female / Other
   - **Age** — in years
   - **Height** — feet + inches (e.g. 5'11")
   - **Weight** — in pounds

2. Tap **"Calculate BMI"**.

3. Your BMI is displayed with a color-coded badge:
   - 🔵 **Underweight** (< 18.5)
   - 🟢 **Normal** (18.5–24.9)
   - 🟡 **Overweight** (25–29.9)
   - 🔴 **Obese** (30+)

4. Below the result, you'll see health recommendations and action items based on your evaluation.

### Formula

```
BMI = (weightLbs / totalInches²) × 703
```

---

## 3. Personalized Workout Plans

### Questionnaire

After calculating your BMI, the **Result** screen lets you customize your workout plan:

| Field | Options |
|---|---|
| **Lifestyle** | Sedentary / Moderate / Active |
| **Experience** | Low (Beginner) / Medium (Intermediate) / High (Advanced) |
| **Primary Goal** | Lose Weight / Build Muscle / Increase Strength / Improve Endurance / General Fitness |
| **Equipment** | Home (no equipment) / Home (dumbbells) / Gym |
| **Timeline** | 4 weeks / 8 weeks / 12 weeks (optional) |
| **Injuries** | None / specific limitations |

### Generation modes

Choose between two modes at the bottom of the Result screen:

| Mode | Description | Requirements |
|---|---|---|
| **Instant** | Built-in science-backed templates | Nothing — works offline |
| **AI** | LLM-generated custom plan | Cloudflare Worker deployed (free, no API key) |

### Instant mode

Tap **"Generate Quick Plan"** to get a structured workout plan based on your questionnaire answers. Plans include:
- Weekly split (PPL, Upper/Lower, Full Body, or Bro Split)
- Day-by-day exercises with sets, reps, rest times
- Warm-up and cool-down instructions
- Progressive overload notes

### AI mode

The AI-generated plan is streamed in real-time:
1. Tap **"Generate AI Plan"**.
2. Watch the plan appear as the AI writes it (progress bar shows stream completion).
3. The AI returns a structured JSON plan that's rendered as day-by-day exercise cards.

### After generation

- **Save** — stores the plan in your history (up to 50 saved plans).
- **Copy** — copies the full plan text to clipboard.
- **Share** — shares via system share sheet.
- **History** — access saved plans from the Home screen ("View Saved Workouts"). Tap a plan to expand/collapse its details. Delete outdated plans.

### Log workouts

From any saved plan in History, tap **"View Logs"** to log actual sets, reps, and weights performed. Track your progress over time against saved plans.

---

## 4. Habit Tracking (Phase 1)

Build and track daily habits alongside your workout plans.

### Creating a habit

1. From the **Home** screen, tap **"See All"** in the Habits section → or navigate to the **Habits** screen directly.
2. Tap **"+ New"** (top-right).
3. Choose a habit type:

| Type | Best for | Example |
|---|---|---|
| **Yes/No** | Simple check-ins | "Drank 8 glasses of water" ✓/✗ |
| **Number** | Counting | "Read 20 pages" |
| **Time** | Duration tracking | "Meditated 15 minutes" |
| **Select** | Custom options | "Morning / Afternoon / Evening" |

4. Optionally set a **daily target** (for Number/Time types).
5. Tap **"Create Habit"**.

### Weekly grid view

Each habit shows a **7-day grid** (Mon–Sun) with colored cells:
- ✅ **Green** — completed for the day
- **Empty** — not done yet
- `-` **Gray dash** — skipped (streak paused but not broken)

Tap any cell to toggle it:
- Empty → mark as done ✅
- Done → mark as skipped `-`
- Skipped → reset to empty

### Managing habits

- **Edit** — tap a habit card below the grid to rename, change type, or update targets.
- **Delete** — tap the red "Delete" button on any habit card. This removes all its entries too.

### Home screen mini-grid

The top 4 habits appear on the Home screen with a compact 7-dot grid. Tap **"See All"** to open the full Habits screen. If you have more than 4 habits, a **"+N more habits"** link appears.

### Data & storage

All habits and daily entries are stored locally in SQLite. Data persists across app restarts. No cloud sync.

### Streak behavior

- Consecutive days of completion = active streak.
- Skipping a day (marking it skipped `-`) **pauses** the streak — it won't break, but that day doesn't count toward the streak either.
- Missing a day entirely (empty cell) **breaks** the streak.

---

## 5. Settings & Configuration

### LLM Provider

The default AI provider is **Cloudflare AI** — free, no API key needed. To configure:

1. Open **Settings**.
2. Select a provider tab (Cloudflare / OpenRouter / Ollama / HuggingFace).
3. For Cloudflare: the default worker URL works if you've deployed `workers/ai-proxy`.
4. For OpenRouter: paste your free API key from [openrouter.ai/keys](https://openrouter.ai/keys).
5. Tap **"Test Connection"** to verify.
6. Tap **"Save Settings"**.

### Recommended models

| Provider | Recommended Model |
|---|---|
| **Cloudflare** | `@cf/meta/llama-3.2-3b-instruct` |
| **OpenRouter** | `openrouter/free` (auto-selects) |
| **Ollama** | `llama3.2` |
| **HuggingFace** | `mistralai/Mistral-7B-Instruct-v0.3` |

### Theme

Toggle between **Dark** and **Cream** in Settings. The theme persists across sessions.

### Profile

The Profile screen acts as the landing page for new users. Once signed up (web passkey), it shows your display name and account creation date. On mobile, you can fill in your name and email for a lightweight profile.

---

## 6. Coming in Future Phases

### Phase 2 — Nutrition

- **USDA FoodData Central integration** — search foods, view nutrition info
- **Daily meal logging** — log breakfast, lunch, dinner, snacks
- **Calorie & macro tracking** — visualize daily intake vs. goals
- **RDI (Reference Daily Intake) comparison** — see how your diet measures up

### Phase 3 — Social & Challenges

- Public leaderboards for habit streaks
- **Challenge system** — create/join group challenges (e.g., "30-day push-up challenge")
- **Friend feed** — see friends' workout completions and streaks
- **Community groups** — topic-based groups for specific goals

### Phase 4 — Gamification & Badges

- **Achievement system** — earn badges for milestones (e.g., "7-day streak", "10 workouts logged", "First habit completed")
- **Experience points (XP)** — gain XP for logging workouts, completing habits, maintaining streaks
- **Level system** — level up as you accumulate XP
- **Visual rewards** — badge gallery on the Profile screen

---

*Altianly — Built with React Native (Expo SDK 56). All data stays on-device unless you choose an external LLM provider.*
