# Changelog — 2026-06-28

**Notion export, Copy/Share buttons, Remove Daily Reminder, Cloudflare Pages routing rewrite**

---

### Notion integration — export structured workout plans to Notion

Users can now send workout plans directly to a Notion database. Each export creates a new page with Name, Date, and BMI properties, plus children blocks for warmup, exercises (as to-do items), cooldown, and notes.

**Screen: SettingsScreen** (`src/screens/SettingsScreen.tsx`)
- New "Notion Integration" section with API Key and Database ID fields
- Save/Remove buttons; config persisted via `saveNotionConfig()` / `deleteNotionConfig()`
- Hint: "Share your database with the integration at Notion → Share"

**Screen: WorkoutPlanScreen** (`src/screens/WorkoutPlanScreen.tsx`)
- "Copy" button — copies formatted plaintext to clipboard (web only; falls back to Alert)
- "Share" button — opens native OS share sheet via `Share.share()`
- "Notion" button — calls `exportToNotion()` with current plan data; requires Notion config in Settings
- Shows alert on success/failure; guarded against non-structured plans

**Screen: HistoryScreen** (`src/screens/HistoryScreen.tsx`)
- Every expanded workout plan card now shows Copy / Share / Notion export chips
- Same behavior as WorkoutPlanScreen buttons (clipboard, share sheet, Notion API)

### Constants — NOTION_API_VERSION

`src/constants/index.ts`
- `NOTION_API_VERSION = '2022-06-28'` — Notion API version header

### Service — Notion API client

`src/services/notion.ts` (existing, wired up this session)
- `exportToNotion(config, planName, structured, rawPlan, bmi, evaluation)` → POST to Notium API
- `buildPlanName(structured)` → returns plan name or fallback "Workout Plan"

### Storage — Notion config CRUD

`src/services/storage.ts` (existing, wired up this session)
- `getNotionConfig()`, `saveNotionConfig(config)`, `deleteNotionConfig()`
- Stored under `altianly_notion_config` key (AsyncStorage)

---

## Files changed

| File | Status |
|------|--------|
| `src/screens/WorkoutPlanScreen.tsx` | modified — Copy, Share, Notion buttons |
| `src/screens/HistoryScreen.tsx` | modified — export chips on expanded cards |
| `src/screens/SettingsScreen.tsx` | modified — Notion Integration section |
| `src/constants/index.ts` | modified — NOTION_API_VERSION added; REMINDER key removed |

---

## Session 2 — Remove Daily Reminder, fix logout, local passkey fallback

### Remove Daily Reminder

The entire reminder system has been removed — it was considered unused/unnecessary.

- **`src/services/notifications.ts`** — deleted entirely (contained `scheduleDailyReminder`, `cancelDailyReminder`, `getReminderConfig`, `ReminderConfig`, notification channel/ handler setup)
- **`src/screens/HomeScreen.tsx`** — removed reminder import, state (`reminder`, `settingReminder`), `setReminder()` in `useFocusEffect`, the reminder UI section (preset buttons + cancel button), and all reminder styles
- **`App.tsx`** — removed `setupNotificationHandler` import and call
- **`src/constants/index.ts`** — removed `REMINDER` storage key
- **`package.json`** — removed `expo-notifications` dependency

### Logout no longer deletes user profile

Previously, logging out called `deleteUserProfile()`, which erased the user's name/email from storage. This meant returning users had to re-register.

- **`src/screens/ProfileScreen.tsx`** — logout now calls `setSessionToken(null)` + `setProfile(null)` without deleting the saved profile; uses `window.confirm()` on web (instead of `Alert.alert`); native `Alert.alert` properly awaits confirmation before clearing state
- **`src/services/auth.ts`** — `loginWithPasskey` falls back to local saved profile when the Cloudflare Worker is unreachable

## Files changed (Session 2)

| File | Status |
|------|--------|
| `src/services/notifications.ts` | **deleted** |
| `src/screens/HomeScreen.tsx` | modified — removed reminder code |
| `App.tsx` | modified — removed notification setup |
| `src/constants/index.ts` | modified — REMINDER key removed |
| `package.json` | modified — expo-notifications removed |
| `src/screens/ProfileScreen.tsx` | modified — logout preserves profile, confirm fix |
| `src/services/auth.ts` | modified — local fallback for passkey login |

---

## Session 3 — Landing page + signup + dev server

### Landing page (`public/altianly-homepage.html`)

A marketing homepage for Altianly, styled with the app's dark theme colors (`#0D1117`, `#161B22`, `#58A6FF`, `#238636`).

- **Hero** — tagline "Your personal fitness AI", glow effect, badge, CTA buttons
- **Features** — 9 cards covering BMI calculator, AI plans, questionnaire, graphs, Notion export, passkey auth, themes, badges, workout logging
- **How It Works** — 3-step flow (metrics → questionnaire → AI plan)
- **App Screens** — 6 mockup cards matching the actual screens
- **Signup form** — name + email fields; submits to `/app?name=...&email=...`
- **CTA** — "Launch Web App" and "View on GitHub" buttons

### Dev server with proxy (`scripts/dev.js`)

Replaced `expo start --web` with a custom Node.js server that:
- Serves the landing page at `http://localhost:3000/`
- Proxies all other requests (`/app*`, bundles, assets, HMR) to the Expo dev server (port 8081)
- Handles WebSocket upgrades for hot reload
- Rewrites `/app*` paths to `/` for Expo so the app loads correctly

### Production routing (`public/_redirects`)

Cloudflare Pages rewrite rules:
- `/` → `/altianly-homepage.html` (landing page at root)
- `/app*` → `/index.html` (Expo app at `/app`)

### `package.json`

- `npm run web` now runs `node scripts/dev.js`

### Dev server removed

The custom dev server proxy was removed shortly after — it wasn't integrating properly. `npm run web` reverted to `expo start --web`.

## Files changed (Session 3)

| File | Status |
|------|--------|
| `public/altianly-homepage.html` | **New** — marketing landing page with signup |
| `public/_redirects` | **New** — Cloudflare Pages routing |
| `scripts/dev.js` | **New** — dev server with landing page + proxy |
| `package.json` | modified — `npm run web` uses custom dev server (removed same session; reverted to `expo start --web`) |
| `scripts/dev.js` | **New then deleted** — dev server proxy was not stable; removed integration |

---

## Session 4 — Cloudflare Pages routing rewrite + landing page polish

### Problem

The `_redirects` file with status `200` (proxy) was unreliable on Cloudflare Pages:
- `/` is a **prefix match** in `_redirects`, matching ALL paths including `/app*`
- Reordering rules didn't help because a 308 redirect rule at the Cloudflare dashboard level (or default behavior) overrode the `_redirects` file
- Cloudflare auto-strips `.html` extensions with 308 redirects (e.g. `/index.html` → `/`), which interfered with proxy targets

### Solution — Filesystem-based routing (no `_redirects`)

Replaced `_redirects` with a build-script restructuring approach:

**`package.json` build script** — After `expo export --platform web`:
1. Creates `dist/app/` directory
2. Renames `dist/index.html` → `dist/app/index.html` (Expo app moves to subdirectory)
3. Copies `public/altianly-homepage.html` → `dist/index.html` (landing page at root)
4. Copies `public/` files (including `_headers`) to `dist/`

Result:
- `/` → `dist/index.html` → **landing page**
- `/app/` → `dist/app/index.html` → **Expo app** (Cloudflare auto-trailing-slash adds 308 from `/app` to `/app/`)
- `/app/*` → served from `dist/app/` directory

**`public/_headers`** — Simplified to only target `/app/*`:
```
/app/*
  Content-Security-Policy: script-src 'self' 'unsafe-eval' 'unsafe-inline'; object-src 'none'
```

Removed the bare `/` rule (which was a prefix match that would collide with `/app/*`).

**`public/_redirects`** — Deleted entirely (no longer needed; routing is via filesystem).

**`public/altianly-homepage.html`** — All `/app` links changed to `/app/` (trailing slash for directory index).

### Landing page signup flow

- "Get Started Free" button scrolls to `#signup` section on the landing page
- User fills name + email, clicks "Get Started" → `GET /app/?name=X&email=Y`
- Expo ProfileScreen reads `window.location.search` params and pre-fills the form
- User clicks "Register with Passkey" to complete registration

### ProfileScreen copy update

- Title: "Create your account"
- Subtitle: "Enter your name and email to begin your fitness journey. No password needed — we use passkeys for secure login."

### Cleanup

- `.gitignore` updated to exclude `Apple Integration/`, `POCKETPAL_*.md`, `brand-spec.md`, `workout_liability_warning.html`
- Unintentionally committed spec/docs files removed from git tracking

## Files changed (Session 4)

| File | Status |
|------|--------|
| `package.json` | modified — build script now moves Expo to `dist/app/`, landing page to `dist/index.html` |
| `public/_headers` | modified — only `/app/*` CSP rule (removed bare `/` collision) |
| `public/_redirects` | **deleted** — replaced by filesystem structure |
| `public/altianly-homepage.html` | modified — "Get Started Free" → `#signup`; all `/app` → `/app/` |
| `src/screens/ProfileScreen.tsx` | modified — updated title/subtitle copy |
| `.gitignore` | modified — added docs/spec exclusions |
