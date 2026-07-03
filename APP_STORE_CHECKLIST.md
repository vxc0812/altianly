# Altianly — Apple App Store Launch Checklist

> Status as of 2026-07-02. You have **no Apple Developer account and no Mac** — that's fine.
> iOS builds and submission run entirely in the cloud via **EAS Build** (Expo's build service).

---

## Already done in the codebase ✅

| Requirement | Where |
|---|---|
| Guest mode — app is fully usable without an account (Guideline 5.1.1) | "Continue without an account" on the Profile screen |
| In-app account deletion (Guideline 5.1.1(v), mandatory since 2022) | "Delete Account" on the Profile screen → wipes server (Cloudflare KV) + local data |
| Camera permission string (`NSCameraUsageDescription`) | `app.json` → shown when the barcode scanner first opens |
| Encryption exemption (`ITSAppUsesNonExemptEncryption: false`) | `app.json` — app only uses standard HTTPS |
| iOS bundle identifier `com.altianly.app` + build number | `app.json` (change the bundle ID before first submission if you prefer another — it's permanent once an app ships with it) |
| Privacy policy page (required URL in App Store Connect) | `https://altianly.pages.dev/privacy.html` |
| Light UI default, no forced dark mode | `userInterfaceStyle: "light"` |
| Medical/liability disclaimer for workout content | WorkoutPlan / WorkoutLog screens |
| EAS build profiles | `eas.json` |

---

## Step 1 — Apple Developer Program (do this first; approval takes 1–2 days)

1. Create/use an Apple ID with two-factor authentication enabled.
2. Enroll at https://developer.apple.com/programs/enroll/ as an **Individual** — **US$99/year**.
   - Individual enrollment needs no D-U-N-S number or company paperwork.
   - Your legal name appears as the seller on the App Store.
3. Wait for the confirmation email before continuing.

## Step 2 — Expo account + EAS CLI (no Mac needed)

```bash
npm install -g eas-cli
eas login                # create a free account at expo.dev if you don't have one
eas init                 # run inside the project — links it to your Expo account
```

Free tier includes a monthly quota of cloud builds (iOS builds queue longer on free tier); paid plans start ~$19/mo if you need more.

## Step 3 — First iOS build

```bash
eas build --platform ios --profile production
```

- EAS walks you through signing: log in with your Apple Developer account and let EAS **create and manage the distribution certificate and provisioning profile for you** (recommended — this is how you avoid needing a Mac/Xcode).
- The build runs on Expo's macOS cloud machines (~15–30 min).

## Step 4 — App Store Connect record

At https://appstoreconnect.apple.com → My Apps → **+ New App**:

| Field | Suggested value |
|---|---|
| Name | Altianly (must be unique on the App Store) |
| Primary language | English (U.S.) |
| Bundle ID | com.altianly.app (appears after Step 3 registers it) |
| SKU | altianly-ios |
| Category | Health & Fitness |
| Age rating questionnaire | Should come out 4+ (no objectionable content); "unrestricted web access" = No |
| Privacy Policy URL | https://altianly.pages.dev/privacy.html |
| Support URL | https://altianly.pages.dev/ |

## Step 5 — App Privacy questionnaire (Data Collection)

Declare in App Store Connect → App Privacy:

- **Contact Info → Name, Email**: collected, linked to identity, used for App Functionality only (optional account). Not used for tracking.
- **Health & Fitness → Fitness**: collected (weight/BMI/workouts), linked to identity **only when an account is used**; App Functionality only.
- **User Content → Other (meals/nutrition logs)**: App Functionality only.
- **No tracking** (no ads/analytics SDKs) → answer "No" to the tracking question everywhere.

## Step 6 — Store assets (prepare while the build runs)

- **App icon**: `assets/icon.png` exists; App Store also needs a **1024×1024 PNG with no transparency/alpha** — verify yours meets that (Expo uses it automatically).
- **Screenshots** (PNG/JPEG, from simulator or device frame tools):
  - 6.9" iPhone (e.g. iPhone 16 Pro Max) — required
  - 6.5" iPhone — recommended
  - **13" iPad — required because `supportsTablet: true`** in app.json. If you don't want to prepare iPad screenshots or test iPad layouts, set `supportsTablet: false` before building.
  - Tip: `eas build --profile preview` produces a simulator build you can run at https://appetize.io to capture screenshots without a Mac.
- **Description, keywords, subtitle** — draft honest copy; avoid medical claims ("treats", "cures", "diagnoses" are rejection triggers for fitness apps).

## Step 7 — Deploy the updated Cloudflare Worker (required for account deletion)

The new `/auth/account/delete` endpoint must be live before review:

```bash
cd workers/ai-proxy
npx wrangler deploy
```

## Step 8 — TestFlight, then submit

```bash
eas submit --platform ios --latest
```

1. Build appears in App Store Connect → TestFlight (processing ~15 min).
2. Test it on a real iPhone via the TestFlight app **before** submitting — especially: guest flow, register/login, barcode scanner permission prompt, account deletion.
3. App Store Connect → your app → select the build → fill in "What's New" → **Submit for Review**.
4. Review typically takes 24–48 hours. If rejected, the reviewer cites the guideline number — fix and resubmit (very common for first submissions).

## Known review risks to keep in mind

| Risk | Mitigation |
|---|---|
| Reviewer can't test login | Provide a demo account (email+password) in the "App Review Information" notes, or point out guest mode explicitly |
| Minimum functionality (4.2) — app must feel native, not a thin web wrapper | You're fine: it's a full native RN app |
| Health claims (1.4.1) | Keep store copy to "general fitness", disclaimer already in-app |
| Broken links | Privacy Policy and Support URLs must load — both are on altianly.pages.dev |

---

## Cost summary

| Item | Cost |
|---|---|
| Apple Developer Program | $99/year |
| EAS Build | Free tier (queued) or ~$19/mo |
| Mac | **Not needed** |
