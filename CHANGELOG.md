# Changelog

_All significant changes to Altianly, consolidated from per-date changelogs._

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
