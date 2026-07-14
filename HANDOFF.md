# Altianly — Session Handoff Document

> **Date:** 2026-07-14
> **Stack:** React Native (Expo SDK 56), TypeScript, AsyncStorage, SecureStore
> **Dev server:** `npm start` → Expo Go, `npm run web` → browser preview
> **Cloudflare:** Pages (web build), Workers (AI proxy), Dashboard (management)
> **Routing:** Filesystem-based — `dist/index.html` (landing page at `/`), `dist/app/index.html` (Expo app at `/app/`)
> **App Store:** iOS submission guide in `APP_STORE_CHECKLIST.md` (EAS Build, no Mac required)
> **Plain-English docs:** `HOW_IT_WORKS.md` (system explained for non-developers) · `ROADMAP.md` (plan forward)
> **Changing computers?** Follow `MIGRATION.md` — covers the gitignored files and `~/.claude` that a clone won't carry

---

## ⚠️ PENDING — capture the 6 app screenshots (post-deploy)

Workflow is now **deploy first, capture screenshots after** (see the `deploy-first-then-screenshots` memory). The previously-held marketing commit `3d0688b` **was deployed this session** — so the live homepage "App Screens" section now shows the CSS phone frames with **labeled placeholders** (not broken images) until the PNGs exist.

Remaining task (no longer blocks a deploy):

1. **Capture 6 app screenshots** and drop them in `public/screens/` — exact filenames + tips in `public/screens/README.md` (`home.png`, `workout-plan.png`, `nutrition.png`, `bmi.png`, `graphs.png`, `workout-log.png`; mobile aspect ratio, cream theme, ~2×). Capture from `altianly.com/app/` via the browser device toolbar (Ctrl+Shift+M → iPhone). Note: `bmi.png` now also shows the new waist-to-height + body-fat cards if optional measurements are entered.
2. **`git add public/screens/*.png && git commit && git push origin master`** — this fills the live phone frames. Verify on `altianly.com`.

---

## What Was Done This Session (2026-07-14, nutrition quality + custom foods)

Researched how **Bevel Health** sources food data (a verified multi-source DB + user-entered custom foods; explicitly *not* an LLM as the data source) and acted on it. **All deployed to production** (`master` pushes auto-deploy the Pages app; the `/food/parse` change also needed a separate `altianly-ai` worker deploy):

- **`/food/parse` fix** (`41f9763` + worker deploy): rewrote the worker extraction prompt so a single named/branded item returns as ONE item (was deconstructing "Chick-fil-A Deluxe" into 8 ingredients + double-counting → 1222 kcal); rounded USDA serving-size float noise; fixed a tier-match casing bug. Live-verified (8→1). Follow-up gap: the Tier-3 (Estimated) LLM fallback for unmatched branded items is still unreliable (160 kcal / 0g protein) — separate LLM-quality issue.
- **Custom foods** (`7f252b4`, new feature): create a food with per-serving macros in the Nutrition add sheet, saved locally (`customFoods.ts`, key `altianly_custom_foods`) and reusable via a "Your foods" list + prepended into search. Stored as `servingSize 100` / unit `serving` so existing per-100g math yields exact per-serving values; `Food` gained an optional `custom` flag. Verified live (490 kcal, reused from "Your foods").
- **Meal-edit double-scaling fix** (`85feb1e`): found during cleanup — deleting/adding a meal item re-scaled the OTHER entries (a 289g item logged at 390 kcal jumped to 1127, compounding each edit). `mapMealEntryToInput` rebuilt existing entries from their absolute nutrients, which `createMealEntry` then re-scaled. Now converts absolutes back to the per-100g base first. Verified: a 289g entry stays 390 kcal across repeated edits (Lunch = 490+390+490 = 1370 exactly).

**Deferred (agreed):** a real nutrition API with restaurant coverage (Nutritionix etc.) — the step beyond custom foods, for later.

---

## What Was Done This Session (2026-07-14, Feature-gap Phase 2)

Built **Phase 2 (Daily Check-in + Health Score)** of `FEATURE_GAP_PLAN.md`. (Phases 1+2 were built on branch `feat/health-measurements`, then **merged to `master` and deployed** to `altianly.com/app/` this session — verified live: Health Score + Daily Check-in cards render on Home.)

- **Daily check-in** — `CheckinScreen` (route `Checkin`) for mood/energy/stress/sleep/water + note; `src/services/checkins.ts` stores one merged record/day in AsyncStorage (`altianly_checkins`). Home **Daily Check-in card** prompts/summarizes.
- **Composite Health Score** — `src/services/healthScore.ts` blends BMI + activity + wellbeing + nutrition-consistency into a 0–100 number (equal-weighted mean of available components; degrades gracefully). Home **hero card** with per-component bars.
- **Habits on web fixed** — `habits.ts` now has an AsyncStorage path for all ops (native SQLite untouched), so habits persist on web. Added an always-visible **"Track a Habit"** Home card for the zero-habits case (the Habits screen was previously unreachable with no habits).
- Verified live in-browser (check-in → score updated to 60 w/ Wellbeing 81; created a habit on web). Typecheck + lint green. See CHANGELOG 2026-07-14.

**Next:** Phase 3 (smarter AI coach: real context + GROW-style structured sessions).

---

## What Was Done This Session (2026-07-14, Feature-gap Phase 1)

Reviewed competitor sites **mindwobble.com** + **lumiaapp.co** (plus the feedback docx's Section 6 on health-metric credibility) and wrote **`FEATURE_GAP_PLAN.md`** — a 15-item gap list in 5 tiers + a 5-phase build plan. Then built **Phase 1 (Richer Health Snapshot)**:

- Optional **waist / neck / hip** measurements on HomeScreen's BMI check (inches, or cm in Metric mode → converted to inches). All skippable.
- Result screen now shows **waist-to-height ratio** + **US Navy body-fat estimate** (color-banded) when measurements exist. Math in `src/services/bmi.ts` (`waistToHeight`, `estimateBodyFatNavy`, `totalHeightInches`).
- Measurements persist in `BMIHistoryEntry`; **HistoryGraph** gained **Body Fat** + **Waist** trend toggles with an empty state for older records.
- Verified live in-browser (34"/15.5"/70" → 16.5% "Fitness", 0.49 WHtR "Healthy"). Typecheck + lint green. See CHANGELOG 2026-07-14.

**Phase 1 remaining:** progress-photo log, chest/arm/thigh circumferences. **Next:** Phase 2 (daily check-in + composite Health Score) per `FEATURE_GAP_PLAN.md`.

---

## What Was Done This Session (2026-07-13, external-review Tier 1)

Source: `Altianly_Feedback_Comparison.docx` — an external three-part review (marketing site, hands-on app testing, competitor comparison vs deep-app.co / askvora.com). Fixed the four ship-blocking defects; see CHANGELOG 2026-07-13 for detail.

- **AI-plan crash** (blank white screen on the headline feature) — hardened JSON parsing in `services/llm.ts` (`normalizeStructuredPlan`) + render guard in `WorkoutPlanScreen`.
- **Dead "Home" links** — `navigate('Home')` is a no-op from root-Stack screens; fixed across WorkoutPlan, WorkoutLog, HistoryGraph, Questionnaire, Timer, PlanLogs, Settings → `navigate('Main', { screen: 'Home' })`.
- **Silent Save/Copy** — `Alert.alert` is a no-op on web; added inline toast/banner confirmations to WorkoutPlan + WorkoutLog.
- **Marketing↔app mismatch** — removed false Notion-export + Settings-theme-toggle claims from `public/altianly-homepage.html`.

### Tier 2 — done this session

- ✅ Stale-BMI snapshot on saved plans (Home quick-start + AI chat now read latest `getBMIHistory()`).
- ✅ Nutrition preview↔saved calorie drift (preview now uses `computeMealCalories`/`scaleNutrient`).
- ✅ Messy USDA names (`cleanFoodName()` title-cases + de-dupes comma segments).
- ✅ BMI copy reframed as a screening tool (softer labels + notes; stored enum unchanged).
- ✅ Default-provider cost/abuse: added per-IP daily rate limit on the worker's AI endpoints (`checkAiRateLimit`, `/ai` + `/food/parse`, default 100/day via `AI_RATE_LIMIT_PER_DAY`). **⚠️ Needs deploy** to take effect: `npx wrangler deploy --config workers/ai-proxy/wrangler.toml` (or `--name altianly-ai` — Wrangler otherwise resolves the ROOT config).

### Still open

- **Deploy the worker** so the AI rate limit goes live (see above). Optionally still rebrand the personal `vishhalchopra` subdomain to a neutral one (e.g. `ai.altianly.com`) — cosmetic, separate from the cost fix.
- **Nutrition names, ideal fix:** reduce to the queried food ("Latte") server-side in `/food/parse`, which has the query context; the client `cleanFoodName()` only tidies formatting.
- **Tier 3 — done this session:** ✅ stripped tech jargon from homepage copy, ✅ fixed ☢→🤖 + Profile "Passkey"→email, ✅ made "free" visible (hero/signup/footer — pricing decision: **free at this time**), ✅ added FAQ section + nav/footer links. Verified in-browser.
- **Tier 3 — phone mockups built, images pending:** the homepage "App Screens" section is now CSS phone frames referencing `public/screens/{home,workout-plan,nutrition,bmi,graphs,workout-log}.png`. Frames show labeled placeholders until the PNGs exist (graceful `onerror`). **Action: drop real screenshots into `public/screens/`** (see that folder's README — mobile aspect, cream theme, ~2×). Automated capture was blocked: browser-tool saves land outside the shell's reach, and in-page DOM→PNG libs (html-to-image/dom-to-image-more) hang on the RN-Web tree while snapdom is ESM-only under the app's `script-src 'self'` CSP. Best route for the images: capture manually (device toolbar) or a Puppeteer script.
- **Tier 3 — still open (higher-effort):** demo GIF; social proof/testimonials (needs real users — do not fabricate); a "vs MyFitnessPal/Fitbod" comparison page; blog/guides + a more distinctive visual identity.
- **Deployed ✅** (commit `ac88f14`): pushed to `master`, which **auto-triggers the Cloudflare Pages build** (Pages project `altianly`, Git Provider = Yes; CI runs `npm run build` itself). Verified live on `altianly.com` and the deployment preview. **Do NOT run `npx wrangler deploy` for the site** — that hits the legacy/unused Workers `altianly` (root `wrangler.jsonc`, last real deploy 2026-07-04); the live site is Pages-on-git-push only. (`npx wrangler deploy --config workers/ai-proxy/wrangler.toml` is still correct for the separate `altianly-ai` AI worker.)

---

## What Was Built This Session (2026-07-02, Session 3)

### #1 — Email-Based Password Reset
- Worker: `POST /auth/password/reset/request` (6-digit code → KV `reset:{email}`, 15-min TTL, sent via **Resend API**; anti-enumeration generic response) and `POST /auth/password/reset/confirm` (max 5 attempts, PBKDF2 re-hash, auto-login token)
- Client: `requestPasswordReset()`/`confirmPasswordReset()` in auth.ts; "Forgot password?" → 2-step reset UI on ProfileScreen
- **Setup needed**: worker secret `RESEND_API_KEY` (free at resend.com); default sender `onboarding@resend.dev` only delivers to the Resend account owner — verify a domain + set `RESET_EMAIL_FROM` for production

### #2 — Bottom Tab Navigation
- Based on Bevel/MapMyFitness/2026 HIG research. New packages: `@react-navigation/bottom-tabs`, `@expo/vector-icons`
- Root stack: `Auth` (ProfileScreen as login gate) → `Main` (tabs: **Home, Workouts(History), Nutrition, Profile**) + pushed screens
- ProfileScreen dual-role via `isAuthRoot()`; auth redirects now target `Auth`/`Main` (was `Profile`/`Home`); tab screens' back links removed

### #3 — Dashboard Redesign (HomeScreen)
- Time-based greeting + date, icon header buttons (theme, settings)
- **Today hero card**: SVG calorie ring (`src/components/ProgressRing.tsx`) vs `DEFAULT_RDI`, macro rows with color dots
- **This Week card**: Mon–Sun workout dots from logs, workout count, 🔥 streak; today ringed in accent
- Removed old streak bar, nutrition widget, "View Saved Workouts" link

### #4 — Icons: Font → Inline SVG (`src/components/AppIcon.tsx`)
- Ionicons font rendered in dev but NOT on the Pages static export (even with `useFonts`); replaced all tab/header icons with react-native-svg strokes — nothing to load, verified live
- `@expo/vector-icons` + `expo-font` removed; nutrition tab icon is an apple
- Login pill on the auth landing now scrolls to the form (it only swapped state below the fold — looked dead)

### #5 — Settings Cleanup
- "Data" section deleted (BMI & Weight Graphs duplicated the Workouts-tab link)
- "AI Features → Conversational Workout" moved to Home as the "AI Trainer Chat" card under Quick Start
- Settings is now pure LLM configuration

### #6 — Production Config (all live-tested)
- USDA key rotated → `USDA_API_KEY` secret on `altianly-ai`; frontend `searchFoods` proxies via `/food/search`
- `RESEND_API_KEY` secret set; reset email delivery verified (owner address: `vishhalchopra@proton.me`)
- Worker deployed with account-deletion + reset endpoints; full register→delete→login-401 lifecycle verified
- Pages is git-connected: every push to master auto-builds and deploys

---

## What Was Built This Session (2026-07-02, Session 2)

### #1 — Guest Mode + Account Deletion (App Store Guideline 5.1.1)
- **"Continue without an account"** on ProfileScreen → `altianly_guest_mode` flag (`setGuestMode`/`isGuestMode` in `storage.ts`); Home auth gate and `SessionManager` allow guests; register/login clears the flag
- **"Delete Account"** on profile view → worker `POST /auth/account/delete` (deletes password hash, user record, history, session from KV) + wipes all local `altianly_*` keys. **Worker must be redeployed** for this endpoint to exist in production

### #2 — Auth Fixes ("account creation is broken")
- `Alert.alert` is a **no-op on react-native-web** — all register/login errors were invisible in the browser. Replaced with inline `formError` text on the form
- Removed **silent local-only fallback** in `registerWithPassword` (created "accounts" whose password never reached the server) and the password-skipping offline login fallback. Server unreachable now shows a clear error suggesting guest mode
- Live-verified against the worker: register 200 / login 200 / wrong password 401 / duplicate 409

### #3 — Workout Category Consistency (yoga generated strength plans)
- **AI mode**: `buildPrompt()` (llm.ts) now includes Workout Style + persona (yoga/pilates instructor) + CRITICAL style rule + placeholder-only example (the old example's "Push-ups 3x10-15" was being echoed verbatim). Live-verified all 5 categories
- **Questionnaire path**: ResultScreen passes `workoutChoice` to QuestionnaireScreen (new optional route param) → included in answers
- **Instant HIIT**: new `hiitCircuitPlan()` in workoutGen.ts — 3 interval days, level-scaled timing (20s/40s×3 → 40s/20s×5). Previously HIIT silently produced the same plan as Strength
- **Gym leak**: 30 gym exercises tagged `gym: true` and excluded from `pickExercise` — Leg Press/Barbell Bench no longer appear in bodyweight plans. Fuzz-tested 600 plans, zero leaks

### #4 — UI Polish (light-first)
- Cream palette warmed (`#FAF9F7` bg, `#E9E5DF` border, warm-gray text) in theme.ts + landing page + privacy page
- New `t.selectedBg` theme token (dark `#1C2533`, cream `#F8EDE7`) replaces per-file ternaries in 8 files
- **Landing page restyled dark → light**, passkey copy rewritten, GitHub links fixed (`vxc0812/altianly`), privacy link in footer
- Debug string removed from HomeScreen nutrition widget

### #5 — App Store Prep
- `app.json`: `com.altianly.app` bundle ID, buildNumber, camera permission string, encryption exemption
- `eas.json` created (EAS cloud builds — no Mac needed); `public/privacy.html` created
- **`APP_STORE_CHECKLIST.md`** — full submission guide (enrollment, EAS, App Store Connect, App Privacy, screenshots, review risks)

### #6 — Cleanup
- Deleted: stray files (`nul`, `~/`, `temp_changes.txt`, `dist_bak/`, 2 stock images), duplicate worker files, `workoutGenerator.ts`, `webauthn.ts` + dead passkey functions (~230 lines)
- All lint warnings fixed; typecheck/lint/`npm run build` green; fresh `dist/` built

---

## What Was Built This Session (2026-07-01/02)

### #1 — NLP Food Parsing (`/food/parse`)
- **Worker endpoint `POST /food/parse`** — accepts free text (e.g. "Chicken sandwich + latte"), uses Cloudflare AI (LLaMA 3.2 3B, temp 0.1) to extract structured food items, looks up each in USDA, returns tier classification:
  - **Tier 1** (Verified) — exact USDA name match
  - **Tier 2** (Transformed) — partial USDA match
  - **Tier 3** (Estimated) — LLM estimate when no USDA match
- **`parseFoodText()`** — frontend function calling the worker endpoint
- **NutritionScreen "Quick add"** — text input + "Parse" button, parsed results shown with checkboxes + tier badges, "Add N items" button batch-adds checked items

### #2 — Barcode Scanning
- `expo-camera` installed; `BarcodeScanner` component scans EAN-13/EAN-8/UPC/Code-128
- **`searchFoodByBarcode()`** — calls Open Food Facts API (`world.openfoodfacts.org/api/v2/product/{barcode}.json`) — free, no auth needed
- Scanned product auto-adds to current meal
- 📷 camera button in search row on NutritionScreen

### #3 — Email + Password Auth (cross-browser)
- **Cloudflare Worker `POST /auth/password/register` and `/auth/password/login`** — PBKDF2 hashing (100,000 iterations SHA-256, per-user 16-byte salt), stored in KV
- **`registerWithPassword()`, `loginWithPassword()`** in `src/services/auth.ts`
- **ProfileScreen** replaced passkey-only form with email+password registration/login with confirm password
- Passkeys are device-bound and don't work cross-browser; email+password enables login from any device

### #4 — Worker Cleanup
- **Removed ~276 lines** of dead WebAuthn/passkey code (CBOR decoder, COSE parser, `extractPublicKey`, 4 handler functions)
- Retained: password auth, food search, food parse, AI, session, data CRUD

### #5 — Cloudflare Pages Build Fix
- **`src/services/database.web.ts`** — mock SQLite database on web (no expo-sqlite import) to prevent `wa-sqlite.wasm` from bundling (was breaking Cloudflare Pages deployment)
- Provides stub `getAllAsync`, `prepareAsync`, `executeAsync`, etc. — habits silently return empty data on web

### #6 — USDA API Key → Worker Secret
- Moved from hardcoded frontend constant to `env.USDA_API_KEY` worker secret (settable in dashboard)
- Key lives only in the worker secret (`USDA_API_KEY`) — never hardcode it in the frontend or docs

### #7 — KV Namespace
- `wrangler.toml` updated with real KV namespace ID `5c5e455f39a84c71b83eb38bb2643e58`

### #8 — HomeScreen Nutrition Widget Fixes (IN PROGRESS)
- **Root cause identified**: `database.web.ts` mock `executeAsync` returned `{}` (no `getAllAsync`) — `getAllHabits()` threw, causing unhandled promise rejections on every focus
- **Mock fix applied**: `executeAsync` now returns `{ getAllAsync: async () => [] }`
- **Nutrition loading isolated**: moved to dedicated `useFocusEffect` — independent of habits/badges loading
- **Date format aligned**: uses local-time `getFullYear/getMonth/getDate` to match NutritionScreen's `formatDate()` (was using `toISOString()` UTC which can mismatch in negative timezones)
- **try/catch added**: main `useFocusEffect` IIFE has error isolation so one feature's failure doesn't cascade
- **Debug string `[d:... m:... c:...]`** added to widget label showing date, meal count, calorie total
- **Status**: mock fix + code changes done; user needs to restart dev server for bundle rebuild before testing

---

## What Was Built This Session (2026-06-21)

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
  - **Pages** — serves Expo web build (`altianly.com`)
  - **Workers** — AI proxy (`altianly-ai.vishhalchopra.workers.dev`)
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
| `src/screens/WorkoutPlanScreen.tsx` | Copy, Share, Notion export buttons added |
| `src/screens/HistoryScreen.tsx` | Copy/Share/Notion chips on expanded plan cards |
| `src/screens/SettingsScreen.tsx` | Notion Integration section (API key + DB ID fields) |
| `src/constants/index.ts` | `NOTION_API_VERSION` added; `REMINDER` removed |
| `CHANGELOG_2026-06-28.md` | **New** — daily changelog |
| `src/services/notifications.ts` | **Deleted** — Daily Reminder removed |
| `src/screens/HomeScreen.tsx` | Modified — removed reminder UI and dependencies |
| `App.tsx` | Modified — removed `setupNotificationHandler` |
| `package.json` | Modified — removed `expo-notifications` |
| `src/screens/ProfileScreen.tsx` | Modified — logout preserves profile, `window.confirm()` on web, `setSessionToken(null)` |
| `src/services/auth.ts` | Modified — local fallback for passkey register/login |
| `public/altianly-homepage.html` | **New** — landing page with signup form, dark theme |
| `public/_redirects` | **New then deleted** — replaced by filesystem-based routing |
| `public/_headers` | **Modified** — simplified to only `/app/*` CSP rule |
| `package.json` | **Modified** — build script restructures `dist/` (Expo in `app/`, landing page at root) |
| `scripts/dev.js` | **New then removed** — dev server proxy was unstable |
| `.gitignore` | **Modified** — added docs/spec exclusions |

---

## Architecture Notes

### Navigation Flow

```
Landing page (altianly.com/) → signup form → GET /app/?name=X&email=Y
                                                         ↓
Auth screen (root; ProfileScreen as login gate, pre-filled from URL params)
  ├─ Register / Login → guest mode off → replace('Main')
  ├─ "Continue without an account" → guest mode on → replace('Main')
  ├─ "Forgot password?" → 2-step email reset → auto-login → Main
  └─ Profile already exists → auto replace('Main')

Main = bottom tabs: Home | Workouts (History) | Nutrition | Profile
  Home → Result → (Questionnaire) → WorkoutPlan
  Home → WorkoutLog (Quick Workout / Start a Split / Resume Latest Plan)
  Home → ConversationalWorkout (AI Trainer Chat card)
  Home → Habits ("See All") | Settings (gear icon)
  Workouts → HistoryGraph | WorkoutLog → PlanLogs
```

### Auth Flow
```
App opens
  ↓
Profile screen loads
  ├─ Profile exists? → navigation.replace('Home')
  └─ No profile? → Landing view with email+password form
                     ├─ Register success → guest mode off → Home
                     ├─ Login success → guest mode off → Home
                     └─ "Continue without an account" → guest mode on → Home

HomeScreen focused
  ├─ Profile exists + isSessionExpired()? → delete profile, reset to Profile
  ├─ No profile AND not guest? → reset to Profile
  └─ OK (logged in or guest) → updateLastActivity(), load data

App foregrounds (AppState 'active')
  └─ Profile exists + isSessionExpired()? → delete profile, reset to Profile
     (guests are never logged out)

Profile view (logged in)
  ├─ Logout → keeps local profile data, clears session
  └─ Delete Account → POST /auth/account/delete (KV wipe) + local altianly_* wipe → Profile
```

### Storage Keys (Updated)
```ts
altianly_workout_history  // WorkoutPlan[]
altianly_workout_logs     // WorkoutLog[]
altianly_bmi_history      // BMIHistoryEntry[]
altianly_llm_config       // LLMConfig (SecureStore + AsyncStorage fallback)
altianly_badges           // Badge[]
altianly_theme            // 'dark' | 'cream'
altianly_user_profile     // UserProfile (SecureStore + AsyncStorage fallback)
altianly_last_activity    // timestamp string (AsyncStorage)
altianly_guest_mode       // 'true' when using the app without an account (AsyncStorage)
altianly_meals            // meals keyed by YYYY-MM-DD (web only, AsyncStorage)
altianly_checkins         // daily wellbeing check-ins keyed by YYYY-MM-DD (AsyncStorage)
altianly_custom_foods     // user-created reusable foods (AsyncStorage)
altianly_habits           // habits (web; native uses SQLite) (AsyncStorage)
altianly_habit_entries    // habit entries (web; native uses SQLite) (AsyncStorage)
```

### Cloudflare Services
| Service | URL | Purpose |
|---------|-----|---------|
| Pages | `altianly.com` (alias: `altianly.pages.dev`) | Serves landing page at `/`, Expo app at `/app/` |
| Workers | `altianly-ai.vishhalchopra.workers.dev` | AI proxy — forwards prompts to Workers AI |
| Dashboard | `dash.cloudflare.com/.../altianly-ai/production` | Worker logs, secrets, deployments |

---

## Known Limitations

| Area | Detail |
|------|--------|
| **OpenRouter free model rate limits** | Free models share an upstream rate-limit pool. If one is 429'd, switching to another free model works immediately. |
| **AI plan parsing** | The LLM is prompted to return JSON but sometimes returns plain text. `extractStructuredPlan()` in `services/llm.ts` uses a lenient parser. Plans that fail to parse show as raw text in History (no day chips). |
| **Web preview** | `npm run web` works but: some RNW internal deprecation warnings (`pointerEvents`), `chrome://theme/` browser warnings — all harmless. |
| **Password reset needs Resend config** | The "Forgot password?" flow is implemented but emails only send once `RESEND_API_KEY` is set on the worker; production delivery to arbitrary users requires a verified domain in Resend. |
| **Notion setup friction** | Users must create their own Notion integration at https://www.notion.so/my-integrations, copy the API key, create a database, share it with the integration, and paste the database ID into Settings. There's no guided setup flow. |
| **Notion export: web only** | The Notion API call uses `fetch()` which works on all platforms, but clipboard Copy uses `navigator.clipboard` (web only). Share uses React Native `Share.share()` (cross-platform). |
| **Notion API key stored in plaintext** | The Notion API key is stored in AsyncStorage, not SecureStore. SecureStore would fail on web (requires `expo-secure-store` with `authenticationType` configured for web fallback). |
| **Routing via filesystem** | Expo app lives at `/app/` (not `/app`). Cloudflare auto-adds trailing slash via 308 redirect. The `_redirects` file was abandoned due to prefix-matching issues and Cloudflare dashboard-level 308 redirects that free accounts can't remove. |
| **Dev server must be restarted after source changes** | Expo web dev server caches the bundle in memory. Hard-reload of browser tab doesn't rebuild — need to Ctrl+C and `npm run web` again. This affects `database.web.ts` mock fixes and HomeScreen code changes. |
| **`/food/parse` needs Workers AI binding** | Worker endpoint works (returns 200) but `env.AI` binding is missing. User needs to add "AI" binding in Cloudflare dashboard → Settings → Variables → AI bindings → Save & Deploy. |
| ~~**Habits return no data on web**~~ **FIXED 2026-07-14** | `habits.ts` now has an AsyncStorage path on web (mirrors nutrition); habits persist on web. Native still uses SQLite via `expo-sqlite`; the `database.web.ts` mock still prevents `wa-sqlite.wasm` from bundling. Nutrition/check-ins/custom-foods also use AsyncStorage on web. |
| **Dev machine: ProtonVPN intercepts DNS** | ProtonVPN's leak protection hijacks ALL port-53 queries (even to 8.8.8.8/TLD servers) and answers from its resolver's cache — after any DNS change, local lookups and non-DoH browsers can show stale results for hours while the rest of the world is fine. Verify DNS via DNS-over-HTTPS only (`https://dns.google/resolve?name=DOMAIN&type=A`). Browser fixes: enable Secure DNS/DoH (done in Chrome), reconnect the VPN to a different server, or wait for TTL expiry. |

---

## Pending Roadmap Items

### Blocker (must fix before next sprint)
| # | Feature | Notes |
|---|---------|-------|
| ✅ | **Worker deployed (2026-07-03)** | `altianly-ai` live with account deletion + password reset endpoints. Live-tested: food/search 200, food/parse 200 (AI binding OK), register→delete→login-fails lifecycle verified. ⚠️ Wrangler resolves the ROOT `wrangler.jsonc` even from `workers/ai-proxy/` — always pass `--config workers/ai-proxy/wrangler.toml` (or `--name altianly-ai`) for AI-worker commands. |
| ✅ | **USDA key rotated (2026-07-03)** | Old key was public in git history; new key lives ONLY as `USDA_API_KEY` secret on `altianly-ai`. Frontend `searchFoods` now proxies through `/food/search`. |
| ✅ | **`RESEND_API_KEY` set (2026-07-03)** | Reset emails live-tested (test send delivered, 200). ⚠️ Resend account owner is `vishhalchopra@proton.me` — with the `onboarding@resend.dev` sender, emails deliver ONLY to that address. Before real users can reset passwords: verify a domain at resend.com/domains and set worker var `RESET_EMAIL_FROM` (e.g. `Altianly <noreply@yourdomain.com>`). |
| ✅ | **Custom domain live (2026-07-04)** | `altianly.com` + `www` on the Pages project (DreamHost-registered, Cloudflare DNS). Resend domain verified — reset emails deliver to ANY address (`RESET_EMAIL_FROM` = `Altianly <noreply@altianly.com>`). Pages auto-deploys on push. |
| 🐛 | **Restart dev server** | `npm run web` on port 8081 may still serve an old bundle (Metro caches in memory). Ctrl+C + restart, then re-test: register/login inline errors, guest mode, tabs, dashboard, yoga plan generation. |

### High Priority (next sprint)
| # | Feature | Notes |
|---|---------|-------|
| A | **Micro-interactions + animations** | Staggered card entrance in WorkoutPlanScreen, set-completion pulse in WorkoutLogScreen, haptic feedback via `expo-haptics` |
| B | **One-tap "Mark Set Done"** | Replace typed reps with a checkbox per set; auto-advance to next exercise |

### Medium Priority
| # | Feature | Notes |
|---|---------|-------|
| C | **Badge visibility improvements** | Inline celebration animation when badge unlocked; badge showcase on HomeScreen |
| D | **PlanLogsScreen polish** | Currently minimal; show exercise-level detail per log entry |
| E | **Adaptive AI re-plan** | After logging N sessions, surface a "Re-generate plan based on your logs" button |
| F | **Notion guided setup** | Show a step-by-step wizard in Settings for creating/sharing a Notion database and getting the API key |
| G | **Notion API key in SecureStore** | Move Notion API key to SecureStore; add web fallback to AsyncStorage |

### Longer Term (needs backend or native build)
| # | Feature | Notes |
|---|---------|-------|
| H | **Apple Health / Google Fit sync** | HealthKit + Google Fit OAuth; pull steps, HRV |
| I | **Social sharing** | "Share on Instagram Story" with workout overlay |
| J | **Premium subscription** | RevenueCat integration; free tier = 3 AI plans/month |
| K | **SQLite migration** | Replace AsyncStorage with SQLite + TypeORM for relational queries |
| L | **Remote push notifications** | Firebase Cloud Messaging for premium weekly plan reminders |

---

## Running the App

```bash
npm start              # Expo dev server (Expo Go on device)
npm run web            # Browser preview
npm run build          # Production export to dist/ — restructures: Expo app at app/, landing page at index.html
npx expo run:android   # Full native Android build
npx expo run:ios       # Full native iOS build

# Cloudflare worker deploy
cd workers/ai-proxy
npx wrangler deploy
```

## Deployed URLs

| URL | Serves |
|-----|--------|
| `https://altianly.com/` | Landing page (`dist/index.html`) |
| `https://altianly.com/app/` | Expo app (`dist/app/index.html`) |
| `https://altianly.com/terms` + `/privacy` | Legal pages (Pages pretty-URLs redirect `.html` → extensionless) |
| `https://altianly.pages.dev/*` | Permanent alias of the same deployment |

---

*Handoff prepared: 2026-07-03 (Session 3 — password reset, bottom tabs, dashboard redesign, SVG icons, production config all live)*
