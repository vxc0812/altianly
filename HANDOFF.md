# Altianly — Session Handoff Document

> **Date:** 2026-06-21
> **Stack:** React Native (Expo SDK 56), TypeScript, AsyncStorage, SecureStore
> **Dev server:** `npm start` → Expo Go or `npm run web` for browser preview
> **Cloudflare:** Pages (web build), Workers (AI proxy), Dashboard (management)

---

## What Was Built This Session

### #1 — Profile / Login Page (`src/screens/ProfileScreen.tsx`)

- **Register** — name, email, password, confirm password; stored in SecureStore with AsyncStorage fallback
- **Login** — email + password verification against stored `UserProfile`
- **Profile view** — avatar (initials circle), name, email, member since date, stats card, logout button
- **Change password** — inline expandable form (current password, new password, confirm); validates current password before saving
- **Login page is now the first screen** — `initialRouteName="Profile"` in `App.tsx`
  - Fresh install → Profile (login form)
  - Returning user (logged in) → auto-redirect to Home
  - Session expired → auto-logout redirects to Profile
  - No "Back" button on the login form (can't escape to other screens without logging in)

### #2 — 10-Hour Inactivity Auto-Logout

- `SESSION_DURATION_MS = 10 * 60 * 60 * 1000` defined in `src/constants/index.ts`
- `SessionManager` component in `App.tsx` listens to `AppState` changes:
  - On app launch: checks session expiry, deletes profile if expired
  - On foreground resume: same check; resets navigation stack to Profile if expired
- `HomeScreen`'s `useFocusEffect` updates `lastActivity` timestamp on every focus (heartbeat)
- `ProfileScreen` starts the session timer after login/register
- After 10 consecutive hours without app use, the user is forced to log in again

### #3 — Auth Gate (other screens protected)

- `HomeScreen` checks for `UserProfile` on every focus; redirects to Profile if missing
- All other screens are only reachable from Home, so the auth gate at Home protects them
- Manual logout resets the stack to Profile

### #4 — Cloudflare Infrastructure Documentation

- `ARCHITECTURE.md` created documenting the 3 Cloudflare services and complete app workflow:
  - **Pages** — serves Expo web build (`044a6f33.altianly.pages.dev`)
  - **Workers** — AI proxy (`altianly.vishhalchopra.workers.dev`)
  - **Dashboard** — worker management console

### #5 — Cloudflare AI Proxy Fixes

- Fixed response parsing in `llm.ts` to handle non-string responses from Workers AI
- Fixed response handling in `workers/ai-proxy/index.js` (wraps result in `{ response: "..." }`)
- Fixed CORS headers in worker

### #6 — Changelog

- `CHANGELOG_2026-06-21.md` created with all 10 commits, file stats, and descriptions

---

## Current File Map (All Changes)

| File | What Changed |
|------|-------------|
| `src/screens/ProfileScreen.tsx` | **New** — login/register form, profile view, change password, logout |
| `src/screens/HomeScreen.tsx` | Auth gate (redirect to Profile if no profile), session heartbeat, "Profile" header link |
| `src/services/storage.ts` | `saveUserProfile`, `getUserProfile`, `deleteUserProfile`, `updateLastActivity`, `getLastActivity`, `isSessionExpired` |
| `src/types/index.ts` | `UserProfile` interface, `Profile` route |
| `src/constants/index.ts` | `SESSION_DURATION_MS`, `USER_PROFILE` and `LAST_ACTIVITY` storage keys |
| `App.tsx` | `SessionManager` component, `initialRouteName="Profile"`, `Profile` screen registration |
| `workers/ai-proxy/index.js` | Fixed response wrapping, CORS fix |
| `src/services/llm.ts` | Fixed Cloudflare response parsing, syntax error |
| `ARCHITECTURE.md` | **New** — full architecture and workflow docs |
| `CHANGELOG_2026-06-21.md` | **New** — daily changelog |

---

## Architecture Notes

### Navigation Flow (Updated)

```
Profile (initial route)
  ├─ Not logged in → login/register form (no back)
  ├─ Logged in (auto-redirect) → Home
  └─ After login/register → navigate.replace('Home')

Home → Result (BMI + questionnaire + health insights) → WorkoutPlan
Home → Settings
Home → History → WorkoutLog (via day chip on any saved plan)
Home → WorkoutLog (via "Resume Latest Plan" quick-start card)
Home → Profile (profile view with logout, change password)
WorkoutLog → PlanLogs
```

### Auth Flow
```
App opens
  ↓
Profile screen loads
  ├─ Profile exists? → navigation.replace('Home')
  └─ No profile? → Show login form
                     ├─ Login success → navigation.replace('Home')
                     └─ Register success → navigation.replace('Home')

HomeScreen focused
  ├─ isSessionExpired()? → delete profile, reset to Profile
  ├─ No profile? → reset to Profile
  └─ OK → updateLastActivity(), load data

App foregrounds (AppState 'active')
  └─ isSessionExpired()? → delete profile, reset to Profile
```

### Storage Keys (Updated)
```ts
altianly_workout_history  // WorkoutPlan[]
altianly_workout_logs     // WorkoutLog[]
altianly_bmi_history      // BMIHistoryEntry[]
altianly_llm_config       // LLMConfig (SecureStore + AsyncStorage fallback)
altianly_badges           // Badge[]
altianly_reminder         // ReminderConfig
altianly_theme            // 'dark' | 'cream'
altianly_user_profile     // UserProfile (SecureStore + AsyncStorage fallback)
altianly_last_activity    // timestamp string (AsyncStorage)
```

### Cloudflare Services
| Service | URL | Purpose |
|---------|-----|---------|
| Pages | `044a6f33.altianly.pages.dev` | Serves Expo web build from `dist/` |
| Workers | `altianly.vishhalchopra.workers.dev` | AI proxy — forwards prompts to Workers AI |
| Dashboard | `dash.cloudflare.com/.../altianly-ai/production` | Worker logs, secrets, deployments |

---

## Known Limitations

| Area | Detail |
|------|--------|
| **Daily Reminder on iOS (Expo Go)** | Scheduled background notifications do not fire in Expo Go on iOS. Requires `npx expo run:ios` (development build). Works on Android Expo Go. |
| **OpenRouter free model rate limits** | Free models share an upstream rate-limit pool. If one is 429'd, switching to another free model works immediately. |
| **AI plan parsing** | The LLM is prompted to return JSON but sometimes returns plain text. `extractStructuredPlan()` in `services/llm.ts` uses a lenient parser. Plans that fail to parse show as raw text in History (no day chips). |
| **Web preview** | `npm run web` works but: notifications disabled, some RNW internal deprecation warnings (`pointerEvents`), `chrome://theme/` browser warnings — all harmless. |
| **Local auth only** | Password is stored in SecureStore on-device. No backend, no password recovery. If the profile is deleted, data is gone. |

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

# Cloudflare worker deploy
cd workers/ai-proxy
npx wrangler deploy
```

---

*Handoff prepared: 2026-06-21*
