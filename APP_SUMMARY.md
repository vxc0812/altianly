# Altianly — AI-Powered Workout Generator

> **BMI tracking · Personalized workout plans · Progress graphs · Export to Notion**
> Built with React Native (Expo SDK 56) + TypeScript

---

## What It Does

Altianly generates structured workout plans tailored to your body metrics and fitness goals. Track your BMI over time, log workouts, and export plans to Notion — all with a dark/cream theme you control.

---

## Key Features

### 🏋️ BMI Calculator
- Supports imperial (ft/in, lbs) and metric (cm, kg) units
- Instant BMI calculation with CDC-standard evaluation (underweight / normal / overweight / obese)
- Auto-saves every entry to a history log with weight tracking
- Streak counter — rewards daily check-ins

### 📋 Smart Questionnaire
- Captures lifestyle (sedentary/moderate/active), exercise level, and training split preference
- Extended questionnaire: primary goal, experience, environment, equipment, health conditions, injuries, sleep, stress, motivation, and more
- Feeds everything into a rich LLM prompt for hyper-personalized plans

### 🤖 AI Workout Plans
- **Multiple LLM providers**: OpenRouter (default), Ollama (local), HuggingFace, Cloudflare Workers AI
- Generates structured plans with warmup, exercises (sets/reps/rest), cooldown, and notes
- Supports 4 training splits: Push/Pull/Legs, Upper/Lower, Full Body, Bro Split
- Plain text output (no markdown), temperature 0.7, max 2048 tokens

### 📈 BMI & Weight History Graphs
- Interactive SVG line chart with date axis, Y-axis ticks, and data dots
- Toggle between BMI and Weight metrics
- Time aggregation: Days / Weeks / Months / Years
- Stats cards: min, max, average, latest
- Delete individual entries or clear all history

### 📤 Export & Share
- **Copy to clipboard** (web)
- **Share via OS share sheet** (cross-platform)
- **Export to Notion** — creates a new database page with Name, Date, BMI properties and structured blocks (warmup, exercises as to-dos, cooldown, notes)
  - Requires user to create a free Notion integration and share a database

### 🎨 Dual Theme
- **Dark mode** — GitHub-dark inspired palette (easy on the eyes)
- **Cream mode** — warm light theme
- Persisted preference across sessions

### 🎯 Gamification
- Badge system: check in daily, log workouts, unlock achievements
- Badge showcase on the home screen

### 📓 Workout Logging
- Log actual sets, reps, and weight per exercise
- Day-by-day tracking tied to a saved workout plan
- View past logs per plan in PlanLogs

### 🔐 Auth (Web)
- **Passkey (WebAuthn)** — register/login with Windows Hello, Touch ID, or Face ID
- Secure session cookie (30-day expiry)
- Local fallback when the Cloudflare Worker is unavailable
- Native builds use auto-login from saved profile

### ⚙️ Settings
- LLM provider config (base URL, model, API key stored in SecureStore)
- Notion integration setup (API key + database ID)
- Theme toggle
- BMI history graph
- Session auto-logout after 10 hours of inactivity

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React Native (Expo SDK 56) |
| Language | TypeScript |
| Navigation | React Navigation (native-stack) |
| Storage | AsyncStorage + expo-secure-store |
| Charts | react-native-svg (custom line chart) |
| AI Providers | OpenRouter, Ollama, HuggingFace, Cloudflare Workers AI |
| Auth (Web) | WebAuthn (passkeys) via Cloudflare Worker |
| Backend | Cloudflare Workers (AI proxy + auth) |
| Export | Notion API (REST) |

---

## Getting Started

```bash
npm install
npm start          # Expo dev server (iOS/Android via Expo Go)
npm run web        # Browser preview at localhost:8084
```

### Deploy Cloudflare Worker

```bash
cd workers/ai-proxy
npx wrangler deploy
```

### Build for Web

```bash
npm run build      # Exports to dist/ for Cloudflare Pages
```

---

## Screens (Navigation Flow)

```
Profile (auth gate)
  └─ Home
       ├─ BMI calculator + history snapshot
       ├─ Result (BMI + health insights)
       ├─ Questionnaire (detailed fitness profile)
       ├─ WorkoutPlan (AI-generated plan with export)
       ├─ Settings (LLM, Notion, theme)
       ├─ History (past plans + logs + graph)
       └─ WorkoutLog (day-by-day exercise logging)
```

---

## Architecture

```
User Input → BMI Calculator → Questionnaire
                    ↓
         LLM Provider (OpenRouter / Ollama / HF / CF)
                    ↓
         Structured Workout Plan (exercises, sets, reps)
                    ↓
         Save to history → Export (Copy / Share / Notion)
```

---

## Target Audience

- **Fitness beginners** who want a science-based starting point
- **Self-trackers** who log BMI, weight, and workouts over time
- **Notion power users** who want their workout plans in their existing workspace
- **Privacy-conscious users** who prefer local AI (Ollama) or want control over their data

---

## Links

- **Web app (Cloudflare Pages):** `altianly.com`
- **AI proxy worker:** `altianly.vishhalchopra.workers.dev`
- **Notion integrations:** https://www.notion.so/my-integrations

---

*Created: 2026-06-28*
