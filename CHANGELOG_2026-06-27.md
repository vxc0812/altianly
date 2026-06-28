# Changelog — 2026-06-27

**BMI & Weight history graphs · 12 files changed**

---

### Line chart component — SVG-based, themed, cross-platform

`src/components/LineChart.tsx` (new)

- Renders a `<Polyline>` with `<Circle>` data points, Y-axis grid lines with tick labels, and X-axis date labels
- Auto-computes Y range with 10% padding; floor at 0
- Shows "need at least 2 data points" fallback for sparse data
- Accepts `data: DataPoint[]`, `theme`, `height`, `lineColor` props
- Exported via `src/components/index.ts` barrel

### History graph screen — full historical review with time aggregation

`src/screens/HistoryGraphScreen.tsx` (new)

- **Metric toggle:** BMI graph (blue/green/yellow/red per evaluation) or Weight graph (purple)
- **Time aggregation:** raw Days, or averaged Weeks / Months / Years — bucketed client-side
- **Stats cards:** total records, lowest value, highest value
- **Record list:** color-coded dots, "Latest" badge on most recent, long-press to delete individual entries with confirmation
- **Clear All:** destructive dialog → `clearBMIHistory()`
- **Empty state:** guidance + "Go to Home" button
- Registered in `App.tsx` as `HistoryGraph` route
- Linked from `HistoryScreen` ("View BMI & Weight Graphs →") and `SettingsScreen` (under new "Data" section)

### Data model — weight tracking added to BMI history

`src/types/index.ts`

- `BMIHistoryEntry` now includes `weightLbs: number`
- Added `GraphTimeUnit` (`'days' | 'weeks' | 'months' | 'years'`) and `GraphMetric` (`'bmi' | 'weight'`)
- Added `HistoryGraph` route to `RootStackParamList`

### Storage — single-entry delete and full clear

`src/services/storage.ts`

- `deleteBMIEntry(timestamp)` — removes one record by timestamp
- `clearBMIHistory()` — removes entire BMI history key

### Home screen — weight captured on BMI save

`src/screens/HomeScreen.tsx`

- `saveBMIEntry` call now passes `weightLbs: Math.round(w)` so weight is tracked alongside BMI from the start

### Cloudflare Worker — REST API for persistent data storage

`workers/ai-proxy/index.js` · `workers/ai-proxy/wrangler.toml`

- Worker extended with 4 data endpoints behind a path router:
  - `GET /data?userId=...` — fetch all BMI/weight entries
  - `POST /data?userId=...` — add an entry
  - `DELETE /data/:ts?userId=...` — delete one entry by timestamp
  - `DELETE /data?userId=...` — clear all entries
- Existing `POST /ai` endpoint preserved (backward-compatible)
- CORS headers applied to all responses
- `wrangler.toml` adds `[[kv_namespaces]]` binding `ALTIANLY_DATA`
- Deploy with: `npx wrangler deploy` (from `workers/ai-proxy/`)

### Cloud sync service — optional remote persistence

`src/services/cloudSync.ts` (new)

- `syncBMIEntry`, `syncGetBMIHistory`, `syncDeleteBMIEntry`, `syncClearBMIHistory`
- All functions return `false` / `null` on failure — app works offline-first with AsyncStorage as source of truth
- Sync URL defaults to the Cloudflare worker base URL; overridable via `setSyncUrl()`
- `isCloudSyncAvailable()` sends a probe GET to check connectivity

### Dependency added

- `react-native-svg` — cross-platform SVG rendering for the line chart

---

### WebAuthn/Passkeys — persistent auth across browser clears

Auth now survives browser history cleanups. Passkeys are stored at the OS level (Windows Hello, Apple Touch ID/Face ID, Google Password Manager) and are never deleted by browser data clears.

**New files:**

`src/services/webauthn.ts`
- `isWebAuthnAvailable()` — detects if navigator.credentials is present (web only; gracefully false on React Native)
- `createCredential(options)` — wraps `navigator.credentials.create()` with base64url ↔ ArrayBuffer conversion
- `getAssertion(options)` — wraps `navigator.credentials.get()` for login

`src/services/auth.ts`
- `registerWithPasskey(name, email, password)` — passkey-based registration: calls worker `/auth/register/begin` → `createCredential()` → worker `/auth/register/complete` → stores session token in cookie
- `loginWithPasskey()` — passkey-based login: calls worker `/auth/login/begin` → `getAssertion()` → worker `/auth/login/complete`
- `loginWithPassword(email, password)` — local password-based login (unchanged, for native fallback)
- `logout()` — clears session token, cookie, and local user profile
- `tryRestoreSession()` — on app boot, checks cookie for session token → validates with worker → restores user profile from server

`src/context/AuthContext.tsx`
- `AuthProvider` — wraps app, calls `tryRestoreSession()` on mount, provides `profile`, `loading`, `refresh`, `logout` to any child via `useAuth()`

**Modified files:**

`src/screens/ProfileScreen.tsx`
- Passkey register button shown above "Create Account" when `isWebAuthnAvailable()` is true
- Passkey login button shown below "Login" for returning users
- Both show `ActivityIndicator` during the async WebAuthn ceremony

`workers/ai-proxy/index.js`
- Added CBOR decoder (`decodeCBOR`) for parsing WebAuthn attestation objects
- Added COSE key parser (`parseCOSEKey`, `extractPublicKey`) for ECDSA P-256 keys
- 6 new auth endpoints:
  - `POST /auth/register/begin` — generates challenge, stores in KV (300s TTL), returns WebAuthn creation options
  - `POST /auth/register/complete` — parses attestation, extracts public key, stores credential + user in KV, returns session token
  - `POST /auth/login/begin` — generates challenge, returns assertion options (no `allowCredentials` — uses discoverable credentials)
  - `POST /auth/login/complete` — verifies ECDSA P-256 signature via `crypto.subtle.verify()`, returns session token + user data
  - `GET /auth/session/:token` — validates session token, returns user profile data
  - `POST /auth/logout` — deletes session token from KV
- Session tokens: random UUIDs stored in KV with 30-day TTL

`workers/ai-proxy/wrangler.toml`
- Added `RP_ORIGIN` var (default `http://localhost:8081`) — used by WebAuthn to set the relying party ID

`App.tsx`
- `AuthProvider` wraps `AppContent` inside the existing `ThemeProvider`
- `SessionManager` now also clears session tokens via `setSessionToken(null)` on expiry

---

## Files changed

| File | Status |
|------|--------|
| `src/components/LineChart.tsx` | added |
| `src/screens/HistoryGraphScreen.tsx` | added |
| `src/services/cloudSync.ts` | added |
| `src/services/webauthn.ts` | added |
| `src/services/auth.ts` | added |
| `src/context/AuthContext.tsx` | added |
| `src/types/index.ts` | modified |
| `src/services/storage.ts` | modified |
| `src/screens/HomeScreen.tsx` | modified |
| `App.tsx` | modified |
| `src/screens/ProfileScreen.tsx` | modified |
| `src/screens/HistoryScreen.tsx` | modified |
| `src/screens/SettingsScreen.tsx` | modified |
| `src/components/index.ts` | modified |
| `src/CHANGELOG_2026-06-27.md` | added |
| `workers/ai-proxy/index.js` | modified |
| `workers/ai-proxy/wrangler.toml` | modified |
| `package.json` | modified |
