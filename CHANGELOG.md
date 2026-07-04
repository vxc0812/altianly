# Changelog

_All significant changes to Altianly, consolidated from per-date changelogs._

---

## 2026-07-04 — Boot resilience fix (phone stuck on "Loading...")

- App hung forever on the entry "Loading..." screen on a phone browser while desktop Chrome worked. Root cause class: boot-critical storage reads (`getUserProfile`, `isGuestMode`) had no failure path — a throwing `localStorage` (Safari restricted site data etc.) rejected the promise and `setLoading(false)` never ran
- Storage reads now return null/false on failure; ProfileScreen entry effect and AuthContext `refresh` wrapped in try/finally — the login form always renders. Confirmed fixed on the affected phone
- Landing page GitHub links removed (nav, CTA, footer) — repo itself is still public; flip to private on GitHub if desired

---

## 2026-07-04 — Custom domain altianly.com live + reset emails for everyone

- **altianly.com** (DreamHost-registered) now serves the site: DNS moved to Cloudflare (nameservers `huxley`/`meilani`), apex + `www` attached to the Pages project as proxied CNAMEs; `altianly.pages.dev` remains a permanent alias. Verified live: `/` 200, `/app/` 200, `/terms` + `/privacy` 200 (Pages pretty-URLs redirect `.html` → extensionless)
- **Resend domain verified** — password-reset emails now deliver to ANY address, not just the account owner. `RESET_EMAIL_FROM` secret = `Altianly <noreply@altianly.com>`; live-tested by sending from `noreply@altianly.com` to an outside inbox (200, delivered)
- In-app legal links and all docs updated `altianly.pages.dev` → `altianly.com`; App Store checklist URLs now use the custom domain
- Debug notes: DreamHost's "Fully Hosted" auto-setup had injected A records that Cloudflare's scanner imported (fixed by replacing with CNAMEs); local ISP DNS interception made verification misleading — DNS-over-HTTPS gave ground truth

---

## 2026-07-04 — Terms of Use & Disclaimers

- **`public/terms.html`** — Terms of Use & Disclaimers page (light theme, matches privacy page): not-medical-advice callout, consult-a-professional list, assumption of risk, **AI-generated content disclaimer** (plans/chat/nutrition estimates may err and aren't professionally reviewed), nutrition data accuracy + BMI limitations, account/data terms, acceptable use, no warranty, limitation of liability, 13+ age requirement
- **`public/privacy.html`** refreshed — "Changes to this policy" section, footer cross-links to terms, date bumped
- **Landing page footer** links Terms & Disclaimers; **in-app legal footer** on the signup screen ("By using Altianly you agree to…" with tappable Terms/Privacy links via `Linking.openURL` + a one-line medical disclaimer)
- App Store note: Terms URL is `https://altianly.pages.dev/terms.html` (usable as the EULA link in App Store Connect; the in-app WorkoutPlan/WorkoutLog disclaimers already cover Guideline 1.4.1)

---

## 2026-07-03 — Worker deployed, USDA key rotated
- `altianly-ai` worker deployed with account-deletion + password-reset endpoints; live-tested (food search/parse 200, register→delete→login-401 lifecycle verified)
- New USDA API key set as `USDA_API_KEY` secret on `altianly-ai` (old key was exposed in public git history — rotated); stray secret/var cleaned off the `altianly` assets worker
- ⚠️ Gotcha: wrangler resolves the ROOT `wrangler.jsonc` even when run from `workers/ai-proxy/` — pass `--config workers/ai-proxy/wrangler.toml` for AI-worker commands
- `RESEND_API_KEY` secret set + live-tested — reset endpoint returns generic 200, test email delivered. Resend account owner is `vishhalchopra@proton.me`; until a domain is verified at resend.com, reset emails only deliver to that address
- **Icons missing on Pages fixed** — Ionicons font failed to render on the static export even with `useFonts`. Replaced the icon font entirely with inline SVG icons (`src/components/AppIcon.tsx`, react-native-svg strokes) for tab bar + header; removed `@expo/vector-icons`/`expo-font`. Verified live: SVG paths in production bundle, zero font references
- Pages auto-deploys from GitHub pushes (git-connected) — no manual redeploy step needed
- **Settings cleaned up** — removed the "Data" section (BMI & Weight Graphs was a duplicate of the Workouts-tab link) and the "AI Features" section; "Conversational Workout" moved to the Home dashboard as an "AI Trainer Chat" card under Quick Start. Settings is now pure configuration (LLM provider/model/API key)
- Nutrition tab icon changed from fork/knife to an apple
- **AI Trainer Chat "Cloudflare error 404" fixed** — `AITrainerAgent.callCloudflare` still POSTed to the worker root instead of `/ai` (same bug fixed in llm.ts on 06-28, missed in the agent's copy)
- **Chat plans are saveable** — when the AI Trainer returns a structured plan, a "Save Plan" button appears under the message; saves into workout history like any other plan (visible in Workouts tab / Resume Latest Plan)
- **Quick Workout style picker + "Surprise Me"** — Quick Workout now opens a chooser (HIIT, Strength, Yoga, Pilates, Gym + 🎲 Surprise Me). HIIT/Strength stay instant/local; the rest are AI-generated via the worker with a loading state. Surprise Me asks the model to invent a style (live runs produced "Parkour Flow Challenge", "Shadow Weaver")
- **AI plan parsing hardened** — worker `/ai` max_tokens 2048→4096; parser now repairs truncated JSON (closes open strings/brackets, strips dangling keys) and sanitizes common small-model mistakes (unquoted rep ranges, trailing commas). Stress test: 9/9 AI generations parsed (was ~7/9)
- **AI Trainer Chat made actually conversational** — the agent forced every message into a weekly-plan JSON template (asking "what yoga poses are best for core?" returned a generic strength plan). New `chat()` method with a dual-mode prompt: questions get plain-text coaching answers (specific poses/exercises, hold times); a JSON plan is produced only when explicitly requested. Live-tested both modes against the deployed model
- **New docs**: `HOW_IT_WORKS.md` — the complete system explained in layman's terms (restaurant analogy, what-happens-when walkthroughs, code tour, glossary); `ROADMAP.md` — 4-phase plan forward (App Store launch → hardening → product depth → growth/revenue)
- Still pending: Resend domain verification for real users

---

## 2026-07-02 (Session 3) — Password reset, bottom tab navigation, dashboard redesign

### Email-based password reset
- **Worker `POST /auth/password/reset/request`** — generates a crypto-random 6-digit code, stores in KV (`reset:{email}`, 15-min TTL), emails it via **Resend API**. Response is identical whether or not the account exists (no email enumeration). Returns 503 if `RESEND_API_KEY` secret isn't configured
- **Worker `POST /auth/password/reset/confirm`** — validates code (max 5 attempts, then invalidated), re-hashes the new password (PBKDF2), deletes the code, and issues a session token (auto-login)
- **`requestPasswordReset()` / `confirmPasswordReset()`** in `src/services/auth.ts`
- **ProfileScreen**: "Forgot password?" link in login mode → 2-step reset UI (email → code + new password + confirm), with resend-code option and inline errors
- **Setup required**: create a free Resend account (resend.com, 100 emails/day free), set worker secret `RESEND_API_KEY`. Default sender `onboarding@resend.dev` only delivers to the Resend account owner's email — production needs a verified domain (`RESET_EMAIL_FROM` var)

### Bottom tab navigation (research-based UI restructure)
Researched Bevel (light card dashboard, big numerals, rings, domain color-coding), MapMyFitness (bottom tabs, weekly activity summary), and 2026 Apple HIG/Material 3 patterns (3–5 bottom tabs, cards, progress rings).
- **`@react-navigation/bottom-tabs` + `@expo/vector-icons` installed**; root stack now: `Auth` (login gate) → `Main` (tab navigator) + pushed screens (Result, Questionnaire, WorkoutPlan, Settings, Timer, WorkoutLog, PlanLogs, ConversationalWorkout, HistoryGraph, Habits)
- **4 tabs**: Home (dashboard), Workouts (HistoryScreen), Nutrition, Profile — Ionicons with filled/outline active states, theme-aware tab bar
- ProfileScreen serves as both `Auth` root and `Profile` tab (`isAuthRoot()` check; `goToApp()`/`resetToAuth()` helpers); History/Nutrition "< Back" links replaced with centered titles

### Home dashboard redesign
- **Greeting header** — time-based ("Good morning, Vishal"), date subtitle, icon buttons (theme toggle, settings) replacing text links
- **"Today" hero card** — SVG calorie progress ring (new `src/components/ProgressRing.tsx`) with big-numeral calories vs RDI target + color-coded protein/carbs/fat rows; taps through to Nutrition tab
- **"This Week" card** — Mon–Sun workout day dots (computed from workout logs), workout count, streak flame; today highlighted with accent ring
- Removed: "View Saved Workouts" text link (now a tab), old streak bar, old flat nutrition widget, Profile header link

---

## 2026-07-02 (Session 2) — Guest mode, auth fixes, workout-category consistency, App Store prep, cleanup

### Guest mode + account deletion (App Store Guideline 5.1.1)
- **"Continue without an account"** button on ProfileScreen — full app works locally without registration; `altianly_guest_mode` flag in AsyncStorage (`setGuestMode`/`isGuestMode` in `storage.ts`)
- **HomeScreen auth gate** allows guests; session expiry only enforced when a profile exists; `SessionManager` in `App.tsx` no longer kicks guests out
- **"Delete Account"** on profile view — new worker endpoint `POST /auth/account/delete` wipes KV records (password hash, user record, history, session); client clears all local `altianly_*` data (**worker redeploy required**)
- Registering or logging in clears guest mode; back button added to the logged-out Profile view when reached from Home

### Auth bug fixes (account creation appeared broken)
- **Errors were invisible on web** — `Alert.alert` is a no-op in react-native-web, so validation errors, 409 "email already exists", and 401 login failures showed nothing. Register/login errors now render as inline red text on the form (all platforms)
- **Silent fake accounts removed** — `registerWithPassword` no longer falls back to a local-only profile when the server call fails (password never reached the server; cross-device login then failed). Offline login fallback (which skipped password verification) also removed. Both now show a clear error suggesting guest mode
- Verified live: register 200, login 200, wrong password 401, duplicate email 409

### Workout plan category consistency
- **AI mode ignored workout choice** — `buildPrompt()` in `llm.ts` never included the selected style; the model echoed the prompt's own "Push-ups 3x10-15" example even for Yoga. Prompt now includes a Workout Style line, style-matched persona (yoga/pilates instructor), a CRITICAL style-adherence rule, placeholder-only example JSON, and 3-6 exercises/day requirement. Live-verified for yoga, pilates, gym, HIIT
- **Detailed questionnaire dropped the choice** — ResultScreen now passes `workoutChoice` to QuestionnaireScreen (new route param), which includes it in answers
- **Instant HIIT = Strength bug** — local generator treated HIIT identically to Strength. New `hiitCircuitPlan()`: 3 interval circuit days with level-scaled timing (low 20s/40s×3, medium 30s/30s×4, high 40s/20s×5) + Tabata progression notes
- **Gym equipment leaked into bodyweight plans** — Leg Press/Skull Crushers/Barbell Bench appeared in home HIIT/strength plans. All 30 gym exercises tagged `gym: true`, excluded from `pickExercise` (gym plans are AI-generated). Fuzz-tested: 600 generated plans, zero leaks

### UI polish (light-first)
- Cream palette warmed to match terracotta accent: bg `#FAF9F7`, border `#E9E5DF`, warm-gray text; landing page + new privacy page use the same values
- New `t.selectedBg` theme token replaces the `isDark ? '#1C2533' : '#F3EDFF'` ternary in 8 files; cream selected-tint changed from purple `#F3EDFF` to warm `#F8EDE7`
- **Landing page restyled dark → light**; stale passkey copy rewritten (email/password + guest), Passkey feature card replaced with Nutrition Tracking, broken GitHub links fixed (`vishhalchopra` → `vxc0812`), footer privacy link added
- Debug `[d:... m:... c:...]` removed from HomeScreen nutrition widget

### App Store preparation
- `app.json`: iOS `bundleIdentifier: com.altianly.app`, `buildNumber`, `NSCameraUsageDescription` (barcode scanner), `ITSAppUsesNonExemptEncryption: false`; Android package aligned
- `eas.json` — EAS Build profiles (cloud iOS builds, no Mac required)
- `public/privacy.html` — privacy policy (required App Store URL), linked from landing footer
- `APP_STORE_CHECKLIST.md` — full submission walkthrough: enrollment, EAS, App Store Connect, App Privacy answers, screenshots, review risks

### Cleanup
- Deleted: `nul`, `~/`, stray empty dirs, `temp_changes.txt`, `dist_bak/`, 2 unreferenced stock images, duplicate worker files (`index-compact.js`, `index.min.js`), `workoutGenerator.ts` (unused re-export), `webauthn.ts` + dead `registerWithPasskey`/`loginWithPasskey` (~230 lines dead since password migration)
- All 7 lint warnings fixed (unused imports); typecheck, lint, and `npm run build` clean
- Docs corrected: worker URL `altianly-ai.vishhalchopra.workers.dev` in HANDOFF/ARCHITECTURE (was missing `-ai`)

### Deployment reminders
- **Worker**: `cd workers/ai-proxy && npx wrangler deploy` (needed for `/auth/account/delete`)
- **Pages**: fresh `dist/` built with all fixes; redeploy when ready
- **Dev server**: restart `npm run web` (Metro caches the old bundle in memory)

---

## 2026-07-02 — HomeScreen widget fix, habits mock fix, nutrition loading isolation

### Bug fixes
- **HomeScreen "Today's Nutrition" widget shows 0** — Root cause: `database.web.ts` mock's `executeAsync` returned `{}` (no `getAllAsync` method), causing `getAllHabits()` to throw `Cannot read properties of undefined (reading 'getAllAsync')`. This unhandled rejection in the main `useFocusEffect` cascaded through React's rendering pipeline.
- **Mock fixed**: `executeAsync` now returns `{ getAllAsync: async () => [] }`
- **Nutrition loading isolated**: moved from the big `useFocusEffect` IIFE to a dedicated `useFocusEffect` — fires independently on every focus regardless of other feature errors
- **Date format aligned**: `loadNutritionData()` now uses local-time `getFullYear/getMonth/getDate` to match `formatDate()` in NutritionScreen (was using `toISOString()` UTC which can differ in negative timezone offsets)
- **Error isolation**: main `useFocusEffect` IIFE now wraps habits/badges calls in try/catch so one feature's failure doesn't prevent other state updates
- **Debug `[d:... m:... c:...]`** added to widget label showing date queried, meal count, and calorie total

### Status
- Fixes applied to source but **dev server must be restarted** (`npm run web` Ctrl+C + restart) to rebuild cached bundle (`index-90a38d87...`)
- User to test after restart and report debug string

---

## 2026-07-01 — NLP food parsing + barcode scanning (Open Food Facts)

### Natural language food parsing
- **Worker `POST /food/parse`** — Accepts plain text (e.g. "Chicken sandwich + latte"), uses Cloudflare AI (LLaMA 3.2 3B) to extract structured food items, looks up each in USDA, returns items with tier classification.
- **`src/types/index.ts`** — Added `ParsedFoodItem { name, servings, tier (1|2|3), food?, estimatedNutrients? }`.
- **`src/services/nutrition.ts`** — Added `parseFoodText(text)` → calls worker endpoint and returns parsed items array.
- **Tier system**: Tier 1 (Verified) = exact USDA match, Tier 2 (Transformed) = partial USDA match, Tier 3 (Estimated) = LLM estimate with no USDA result.
- **NutritionScreen** — Added "Quick add" text input in the search modal. Shows parsed results with checkboxes, tier badges (Verified/Estimated/AI guess), per-item macros, and "Add N items" button. Batch-adds all checked items to the selected meal.

### Barcode scanning (Open Food Facts)
- **`src/services/nutrition.ts`** — Added `searchFoodByBarcode(barcode)` → calls `world.openfoodfacts.org/api/v2/product/{barcode}.json`, maps response to `Food` type.
- **`src/components/BarcodeScanner.tsx`** — Camera-based barcode scanner using `expo-camera`. Requests camera permission, scans EAN-13/EAN-8/UPC/Code-128 barcodes. On scan, looks up product and auto-adds to current meal with 1 serving.
- **NutritionScreen** — Added 📷 scan button next to the search bar. Shows BarcodeScanner as a full-screen overlay.

### Tier badges in UI
- **Verified** (green) — exact USDA name match
- **Estimated** (yellow) — partial USDA match
- **AI guess** (gray) — no USDA data, LLM estimated

---

## 2026-07-01 — (continued) Cloudflare Pages build fix + worker cleanup

### Cloudflare Pages build fix
- **`database.web.ts`** — Created mock SQLite for web builds. Metro auto-selects `.web.ts` over `.ts` on web, so `expo-sqlite`'s WASM import (`wa-sqlite.wasm`) is never bundled. This fixes the Cloudflare Pages build which was failing because Metro couldn't resolve the `.wasm` file. On native, the real `database.ts` with SQLite is used.

### Worker code trimmed (~276 lines removed)
- Removed unused WebAuthn/passkey code: CBOR decoder, COSE key parser, `extractPublicKey`, `handleRegisterBegin`, `handleRegisterComplete`, `handleLoginBegin`, `handleLoginComplete`, `generateChallenge`, `bytesToBase64url`, `base64urlToBytes`.
- Retained: password auth (PBKDF2 register/login), session validate, logout, food search, AI endpoint, data CRUD.
- USDA API key changed from hardcoded `DEMO_KEY` to `env.USDA_API_KEY` secret variable (settable in Cloudflare dashboard → Settings → Variables).

### KV namespace configured
- `wrangler.toml` updated with real KV namespace ID: `5c5e455f39a84c71b83eb38bb2643e58`.

### Deployment notes
- Worker must be deployed as a **Worker** (not Pages project). Use Cloudflare dashboard → Create application → Worker → paste `index.js`. Set KV binding `ALTIANLY_DATA` + variable `USDA_API_KEY` in Settings → Variables.

---

## 2026-07-01 — Email/password auth + Nutrition bugfixes + web SQLite → AsyncStorage migration

### Email + password authentication (cross-browser/cross-device)

- **Cloudflare Worker** — Added `POST /auth/password/register` and `POST /auth/password/login` endpoints with PBKDF2 password hashing (100,000 iterations, SHA-256, random 16-byte salt per user). Passwords are never stored in plaintext — only the salted hash is persisted in KV.
- **`src/services/auth.ts`** — Added `registerWithPassword(name, email, password)` and `loginWithPassword(email, password)`. Both try the worker first; fall back to local-only save if the worker is unreachable (offline/local-dev support).
- **ProfileScreen** — Replaced passkey-only form with email + password registration/login. Toggle between register and login mode. Confirm password field with match validation. Login pill now switches to the login form. Removed passkey-specific code and disclaimer modal.

### Deployment requirements

The auth endpoints require the Cloudflare Worker to be deployed with a KV namespace (`ALTIANLY_DATA`). To deploy:
```bash
cd workers/ai-proxy
npx wrangler deploy
```
Once deployed, user accounts persist across browser cache clears and are accessible from any browser via email + password login.

### Bug fixes

### Bug fixes

- **Login stuck** — `registerWithPasskey` fallback to local-only save when Cloudflare Worker returns 400 (passkey endpoints routed to `/ai` handler). Registration now works on all platforms without a working worker.
- **"Add to Meal" hangs on web (`npm run web`)** — Root cause: `expo-sqlite`'s `openDatabaseAsync()` on web creates a WebWorker to run wa-sqlite (WebAssembly SQLite). The WASM/OPFS initialization never completed in the user's browser, leaving all database operations queued behind a pending `getDb()` promise indefinitely. `openDatabaseSync()` requires `SharedArrayBuffer` (`Cross-Origin-Opener-Policy` headers) which the Expo dev server doesn't set.
- **Food search 429 (Too Many Requests)** — USDA `DEMO_KEY` rate limit exhausted. Updated to a registered API key.

### Web storage migration (SQLite → AsyncStorage)

On web (`Platform.OS === 'web'`), `createMeal`, `getMealsForDate`, and `deleteMeal` now use **AsyncStorage** (JSON read/write) instead of SQLite. This avoids the WebWorker/WASM initialization entirely — operations are simple localStorage-backed reads/writes.

SQLite is preserved for native (iOS/Android) where it works reliably.

### Nutrition UI fixes

- **Stale closure in `handleAddFood`** — `dateStr` state was derived from `currentDate` but used in `useFocusEffect`'s callback closure, causing stale dates on re-render. Replaced with direct `formatDate(currentDate)` calls.
- **Error visibility** — Added `catch` block to `handleAddFood` with `Alert.alert()` for error feedback; added `Alert` import that was missing.
- **`loadMeals` undefined** — renamed to `loadMealsForDate(date)` with explicit parameter (no closure dependency).

### Database singleton race condition

`getDb()` now uses a `dbPromise` guard to prevent concurrent calls from both trying to open the database (re-initializing WASM/OPFS on web). First caller sets the promise; subsequent callers await the same promise.

---

## 2026-06-30 — Phase 2 Nutrition: USDA food search + meal logging + daily macros

### USDA FoodData Central integration
- **Cloudflare Worker** — `POST /food/search` added, proxies USDA FoodData Central with `DEMO_KEY` (free, 1,000 req/hr). Returns normalized `{ foods: [...] }` with nutrients per 100g.
- **No local food database** — queries go through the CF worker proxy, avoiding a large bundled DB. Cloudflare caches responses at edge.

### Nutrition types (`src/types/index.ts`)
| Type | Fields |
|---|---|
| `Food` | `{ id, name, brandName?, servingSize?, servingUnit?, nutrients }` |
| `FoodNutrients` | `{ calories, protein, carbs, fat, fiber?, sugar?, sodium? }` |
| `MealEntry` | `{ id, mealId, foodId, foodName, foodBrand?, servingSize, servingUnit, servings, calories, protein, carbs, fat, fiber, sugar, sodium, createdAt }` |
| `Meal` | `{ id, date, type, entries[], createdAt }` |
| `MealType` | `'breakfast' \| 'lunch' \| 'dinner' \| 'snack'` |
| `RDITarget` | `{ calories, protein, carbs, fat, fiber }` |
| `Nutrition` route | Added to `RootStackParamList` |

### Database migration (`src/services/database.ts`)
- `meals` table: `id TEXT PK, date TEXT, type TEXT CHECK(breakfast/lunch/dinner/snack), created_at INTEGER`
- `meal_entries` table: `id TEXT PK, meal_id TEXT FK, food_id TEXT, food_name TEXT, food_brand TEXT, serving_size REAL, serving_unit TEXT, servings REAL, calories REAL, protein REAL, carbs REAL, fat REAL, fiber REAL, sugar REAL, sodium REAL, created_at INTEGER`
- Nutrients stored **pre-calculated** (scaled per serving) for fast daily totals

### Nutrition service (`src/services/nutrition.ts`)
- `searchFoods(query)` — USDA search via CF worker
- `createMeal(date, type, entries[])` — transactional insert via prepared statements
- `getMealsForDate(date)` — retrieves meals with all entries
- `getDailyTotals(meals)` — sums all entries across all meals
- `deleteMeal(mealId)` — cascading delete of meal + entries
- `DEFAULT_RDI` — 2,000 kcal / 50g protein / 275g carbs / 65g fat / 25g fiber

### NutritionScreen (`src/screens/NutritionScreen.tsx`)
- **Date navigation** — left/right arrows, displays "Today"/"Yesterday"/"Tomorrow"
- **Calorie ring** — circular display with progress bar vs 2,000 kcal RDI
- **Macro cards** — protein/carbs/fat horizontal bars with grams + targets
- **Meal sections** — breakfast, lunch, dinner, snack with collapsible food entries
- **Food search modal** — bottom sheet with search input, USDA results list, serving size adjuster (± buttons + decimal input), nutrient preview per serving, confirm to add
- **Delete entries** — per-entry delete button, re-creates meal with remaining entries
- **Theme-aware** — follows dark/cream brand-spec palette

### HomeScreen mini-widget
- **Today's Nutrition** card showing calories/protein/carbs/fat vs RDI targets with colored dots
- Tapping navigates to the full Nutrition screen
- Data loads on screen focus via `getMealsForDate(todayStr)`

### Route registration
- `Nutrition` route added to `App.tsx` stack navigator
- `RootStackParamList` updated with `Nutrition: undefined`

### Notable
- TypeScript compiles cleanly (zero errors with TS 6.0.3 strict mode)
- `renderFoodResults()` extracted to module-level function to work around TS 6.0.3 JSX `.map()` type inference issue

---

## 2026-06-30 — Quick Workout choices + consolidated changelog

### Quick Workout: HIIT, Strength, Yoga, Pilates, Gym

Replaced the auto-derived training split with 5 explicit workout type choices on the Result screen. Users now pick a workout type before generating a plan.

**Hybrid generation model:**
| Workout | Generator | Requires Cloudflare Worker |
|---|---|---|
| **HIIT** | Local (existing bodyweight exercises) | No |
| **Strength** | Local (existing bodyweight + calisthenics) | No |
| **Gym** | Cloudflare AI — full gym equipment assumed | Yes |
| **Yoga** | Cloudflare AI — poses, flows, breath work | Yes |
| **Pilates** | Cloudflare AI — core strength, mat exercises | Yes |

**Key changes:**
- `src/types/index.ts` — Added `WorkoutChoice` type (`'hiit' | 'strength' | 'yoga' | 'pilates' | 'gym'`), added `workoutChoice?` to `QuestionnaireAnswers`
- `src/constants/index.ts` — Added `WORKOUT_CHOICES` array with icons and descriptions
- `src/screens/ResultScreen.tsx` — Added 5 workout type picker cards above the questionnaire; passes `workoutChoice` to WorkoutPlan
- `src/services/workoutGen.ts` — Added `buildCloudflarePrompt()` that returns tailored prompts for each workout type; added 30 gym equipment exercises to the `EXERCISES` array; `generateWorkoutPlan()` now accepts `workoutChoice` param
- `src/screens/WorkoutPlanScreen.tsx` — In instant mode, routes Gym/Yoga/Pilates to Cloudflare worker with the tailored prompt; falls back with an error message if CF is unreachable, suggests HIIT/Strength as offline fallback
- `src/screens/HomeScreen.tsx` — Quick workout passes `workoutChoice: 'strength'` for backward compatibility

### Consolidated CHANGELOG.md

Created `CHANGELOG.md` as the single source of truth, replacing per-date changelog files.

### Changelog files consolidated

| File | Status |
|---|---|
| `CHANGELOG.md` | **New** — single consolidated changelog |

---

## 2026-06-28 — Landing page polish, Profile fixes

### ProfileScreen landing page polish
- Removed `< Back` link from the landing page (no back navigation from hero/signup)
- Added **Login** pill button in top-right corner (web passkey only) for quick access
- Added `landingHeaderRow`, `loginPill`, `loginPillText` styles

### Cloudflare default provider
- Default LLM provider changed from OpenRouter to **Cloudflare AI** (free, no API key)
- `DEFAULT_LLM_CONFIG` points to `DEFAULT_LLM_CONFIGS.cloudflare`
- Default model: `@cf/meta/llama-3.2-3b-instruct`
- `RECOMMENDED_MODELS` updated; OpenRouter marked `recommended: false`
- Settings screen initializes to Cloudflare when no config saved

### Bug fix — Cloudflare worker URL
- `callCloudflare()` and `testConnection()` both hit `${cfg.baseUrl}/ai` instead of bare `cfg.baseUrl` (was hitting root → 404)

### Notion integration removed
- `src/services/notion.ts` — **deleted**
- `src/services/storage.ts` — removed `NotionConfig`, `getNotionConfig`, `saveNotionConfig`, `deleteNotionConfig`
- `src/constants/index.ts` — removed `NOTION_CONFIG` key, `NOTION_API_VERSION`
- `src/screens/WorkoutPlanScreen.tsx` — removed Notion export handler, button, banner
- `src/screens/HistoryScreen.tsx` — removed Notion import, export handler, button
- `src/screens/SettingsScreen.tsx` — removed entire Notion section (state, form, save/remove, styles, `Linking` import)
- `src/screens/ProfileScreen.tsx` — removed "Export to Notion" text

### New docs
- `USER_MANUAL.md` — User-facing feature guide covering BMI, workout plans, habits, settings, and upcoming phases
- `PROJECT_DOCS.md` — Updated technical reference with habits, Cloudflare default, brand-spec theme, landing page, removed Notion

### Brand-spec theme alignment
- Dark palette: `#121316` bg, `#1C1D22` surface, `#C96442` accent, `#34D399` success
- Cream palette: `#F9FAFB` bg, `#FFFFFF` surface, `#C96442` accent, `#10B981` success
- Added `FONT_MONO` constant (`JetBrains Mono` / `IBM Plex Mono`)
- `public/altianly-homepage.html` landing page colors aligned with brand-spec

### OpenRouter default model fix
- Default model changed from deprecated `mistralai/mistral-7b-instruct:free` to `openrouter/free`
- Added friendly error message when API key is missing/401/403

---

## 2026-06-28 (Session 4) — Cloudflare Pages routing rewrite + landing page polish

### Filesystem-based routing (no `_redirects`)
- `package.json` build script restructures `dist/`: Expo app at `dist/app/`, landing page at `dist/index.html`
- `public/_redirects` **deleted** — replaced by filesystem structure
- `public/_headers` simplified to only target `/app/*`
- Landing page "Get Started Free" → scrolls to `#signup`; all `/app` links → `/app/` (trailing slash)
- ProfileScreen title/subtitle copy updated

---

## 2026-06-28 (Session 3) — Landing page + signup + dev server

### Landing page (`public/altianly-homepage.html`)
- Marketing homepage with hero, 9 feature cards, 3-step flow, 6 screen mockups, signup form
- Cloudflare Pages routing: `/` → landing page, `/app/*` → Expo app
- Dev server proxy (later reverted to `expo start --web`)

---

## 2026-06-28 (Session 2) — Notion export, Copy/Share, Remove Daily Reminder

### Features added
- Copy button — copies plan text to clipboard (web)
- Share button — native OS share sheet
- Notion export — structured plans to Notion database
- History screen: export chips on expanded cards

### Removed
- Daily Reminder system (notifications) — `src/services/notifications.ts` deleted, `expo-notifications` removed

### Fixed
- Logout no longer deletes user profile (preserves name/email for next login)
- `loginWithPasskey` falls back to local saved profile when Cloudflare Worker unreachable

---

## 2026-06-28 (Session 1) — Notion integration + routing rewrite

See details in `CHANGELOG_2026-06-28.md`.

---

## 2026-06-27 — BMI & Weight history graphs, WebAuthn/Passkeys

### Features added
- `src/components/LineChart.tsx` — SVG-based, themed, cross-platform line chart
- `src/screens/HistoryGraphScreen.tsx` — full historical BMI/weight review with time aggregation
- `src/services/cloudSync.ts` — optional Cloudflare Worker remote persistence
- `src/services/webauthn.ts` — WebAuthn credential creation/getAssertion wrappers
- `src/services/auth.ts` — passkey registration/login/session management
- `src/context/AuthContext.tsx` — auth provider with session restore on boot
- Cloudflare Worker: 6 auth endpoints + 4 data CRUD endpoints + CBOR decoder + COSE key parser

---

## 2026-06-26 — Password security, shared components, lint cleanup

### Security
- Password hashing: 10,000× PBKDF2-like iterations, constant-time comparison, Unicode normalization
- SecureStore: static import with explicit platform guards
- Registration: min 8 chars, complexity enforced (lower+upper+digit), live strength indicator

### Components
- `src/components/Button.tsx`, `Card.tsx`, `Input.tsx` — shared themed components
- ResultScreen refactored to use shared components (~60 lines removed)

### Fixes
- QuestionnaireScreen: replaced 4 dead `<Text>` placeholders with actual `<TextInput>`s
- ConversationalWorkoutScreen: registered in navigation, provider dispatch, theme-aware
- Lint: 24 warnings to 0
- Dead code: `exercises.json` + `exerciseDb.ts` removed

### WorkoutGen
- Removed unused `gender`, `bmi`, `evaluation` params from `generateWorkoutPlan()`

---

## 2026-06-21 — Dashboard restructure, exercise DB, Cloudflare Worker

### Features added
- HomeScreen converted to training hub: Quick Workout, Start a Split (PPL/Upper-Lower/Full Body/Bro Split), collapsible BMI card, recent activity, streak bar
- `src/services/workoutGen.ts` — self-contained exercise database + generators for 4 splits
- `workers/ai-proxy/` — Cloudflare Worker with AI endpoint + CORS
- `src/services/badges.ts` — badge/achievement system
- Cloudflare AI provider in `src/services/llm.ts`

### Files changed
32 files, +4360 / −328 lines across this session.

---

## Earlier sessions

Pre-date changelogs cover the initial app scaffold, BMI calculator, workout plan generator, questionnaire, settings, history, timer, workout logging, and foundational infrastructure. See git history for details.

---

_Format: Each section covers one session's worth of changes. The latest session is at the top._
