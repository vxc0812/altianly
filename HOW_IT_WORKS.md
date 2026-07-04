# How Altianly Works — In Plain English

*A non-technical tour of the app, the code, and the machinery behind it. Last updated: July 3, 2026.*

---

## What is Altianly?

Altianly is a fitness companion app. It calculates your BMI, builds workout plans (either instantly from built-in rules or custom-made by an AI), tracks the meals you eat, logs your workouts, and keeps you motivated with streaks and badges. It runs as a website today and is being prepared for the Apple App Store.

---

## The Big Picture: Three Parts

Think of Altianly as a restaurant:

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│   THE APP        │      │   THE SERVER      │      │   THE STORAGE    │
│  (dining room)   │ ───→ │   (kitchen)       │ ───→ │ (pantry/files)   │
│                  │      │                   │      │                  │
│ What you see and │      │ Does the heavy    │      │ Remembers things │
│ tap on. Runs on  │      │ lifting: AI plans,│      │ between visits:  │
│ your phone or in │      │ food lookups,     │      │ accounts, synced │
│ your browser.    │      │ accounts, emails. │      │ data.            │
└─────────────────┘      └──────────────────┘      └─────────────────┘
```

1. **The App** — everything you see: buttons, cards, charts, the chat. Written once in a technology called *React Native (Expo)*, which lets the same code run on iPhones, Android phones, and web browsers.

2. **The Server** — a small program called a *Cloudflare Worker* that lives on Cloudflare's worldwide network (so it's fast everywhere). The app calls it whenever it needs something it can't do alone: run the AI, look up food nutrition, create accounts, send password-reset emails.

3. **The Storage** — two kinds:
   - **On your device**: your workout history, meals, habits, streaks, and preferences live right on your phone/browser. This is why the app works even without an account.
   - **On the server** (only if you create an account): your name, email, a scrambled version of your password, and synced data — so you can log in from another device.

---

## What Happens When You...

### ...open the app
The app first checks: do you have an account saved, or did you choose "Continue without an account" (guest mode)? If yes to either, you land on the **Home dashboard**. If not, you see the login screen. Guests get the full app — everything just stays on their device.

### ...look at the Home dashboard
- The **"Today" ring** shows calories eaten vs. your 2,000-calorie target, with protein/carbs/fat below. It reads today's meals from your device.
- The **"This Week" dots** mark which days you logged a workout, computed from your workout log.
- The **streak flame** counts consecutive days you've checked your BMI.

### ...generate a workout plan
Two routes, and you choose per plan:
- **Instant**: the app has a built-in library of ~75 exercises with rules ("a medium-experience person gets 3 sets of 10–15 reps with 60 seconds rest"). It assembles a plan in a split second, offline. HIIT and Strength plans work this way.
- **AI-generated**: for Yoga, Pilates, Gym, "Surprise Me," or anything you ask the AI Trainer chat, the app sends your request (age, experience, chosen style) to the server, which passes it to an AI language model (Meta's Llama, running on Cloudflare). The AI writes a plan; the app reads it back and displays it as day-by-day cards. Because small AI models sometimes make formatting mistakes, the app has a "repair shop" that fixes cut-off or slightly malformed responses before showing them to you.

### ...log a meal
Three ways in:
1. **Search** — you type "banana"; the server asks the USDA's national food database and returns nutrition facts.
2. **Barcode scan** — the camera reads the barcode; the app looks it up in Open Food Facts (a free public product database).
3. **Quick add** — you type "two eggs and toast" in plain English; the AI extracts the foods, and each gets a confidence tier: ✅ Verified (exact database match), ⚠️ Estimated (close match), or 🤖 AI guess.

### ...chat with the AI Trainer
Your message goes to the AI with instructions: *if it's a question, answer conversationally; if they ask for a plan, produce one.* When the AI returns a structured plan, a "Save Plan" button appears so you can keep it.

### ...create an account or reset a password
Your password is never stored as-is — it's run through a one-way scrambler (PBKDF2, 100,000 rounds) and only the scramble is kept. Even we can't read your password. Forgot it? The server emails you a 6-digit code (valid 15 minutes, 5 attempts max) and you set a new one. Deleting your account erases everything server-side and on-device.

---

## A Tour of the Code

If you open the project folder, here's what each area does:

| Where | What it is, in plain words |
|---|---|
| `App.tsx` | The front door. Sets up the theme, decides login-screen-or-app, and defines the bottom tab bar (Home, Workouts, Nutrition, Profile). |
| `src/screens/` | One file per screen you can visit — HomeScreen is the dashboard, NutritionScreen is the meal tracker, and so on. Each describes what's on the screen and what happens when you tap things. |
| `src/components/` | Reusable building blocks — buttons, cards, the calorie ring (`ProgressRing`), the hand-drawn SVG icons (`AppIcon`), the barcode scanner. |
| `src/services/` | The "how things actually get done" layer, with no visuals: `bmi.ts` does the BMI math, `workoutGen.ts` builds instant plans, `llm.ts` talks to AI providers, `nutrition.ts` handles meals, `auth.ts` handles accounts, `storage.ts` saves/loads everything on-device. |
| `src/constants/` | The app's settings book: color palettes (`theme.ts`), storage key names, workout type lists, default AI configuration. |
| `src/types/` | The dictionary. Defines the exact shape of every piece of data (what fields a "WorkoutPlan" has, etc.) so mistakes get caught before the app ships. |
| `workers/ai-proxy/index.js` | The entire server — one file. Handles accounts, password resets, food search, AI requests, and data sync. |
| `public/` | The marketing website (landing page) and privacy policy. |
| `assets/` | App icons and images. |

**Design system in one line:** every screen pulls its colors from a shared palette (warm light "cream" by default, dark mode optional), so changing one value in `theme.ts` restyles the whole app.

---

## How It Gets to Users

```
You (or Claude) edit code
        │
        ▼
   git push to GitHub  (the project's shared history — every change is recorded)
        │
        ▼ (automatic, ~3 minutes)
   Cloudflare Pages builds the web app and publishes it
        │
        ▼
   https://altianly.com  ← live site (landing page + app at /app/)
```

The server part deploys separately with one command (`npx wrangler deploy --config workers/ai-proxy/wrangler.toml`).

For the **Apple App Store**, the same app code gets compiled into a real iPhone app by EAS Build (Expo's cloud service — no Mac needed) and submitted through Apple's portal. The full step-by-step lives in `APP_STORE_CHECKLIST.md`.

---

## Why It's Built This Way

- **One codebase, three platforms.** Writing the app once in React Native means the web version and the iPhone version can't drift apart.
- **Guest-first.** Everything works without an account because data lives on-device. Accounts are purely additive (sync + recovery). This is also an App Store requirement.
- **Almost free to run.** Cloudflare's free tiers cover the site, the server, the database, and the AI. The only real costs are Apple's $99/year developer fee and optionally a domain.
- **Privacy by default.** No ads, no trackers, no analytics. The privacy policy (`public/privacy.html`) reflects exactly what the code does.

---

## Glossary

| Term | Meaning |
|---|---|
| **React Native / Expo** | The toolkit that lets one codebase become an iPhone app, Android app, and website. |
| **Cloudflare Worker** | A tiny server program that runs on Cloudflare's global network — no server computer to maintain. |
| **KV** | "Key-Value" storage — the server's filing cabinet (accounts, sessions, synced data). |
| **LLM** | Large Language Model — the AI that writes plans and answers chat (Meta's Llama 3.2, hosted by Cloudflare). |
| **AsyncStorage / SecureStore** | Your device's local memory for the app; SecureStore is the encrypted flavor used for sensitive bits. |
| **PBKDF2** | The one-way password scrambler. Scrambling is easy; unscrambling is practically impossible. |
| **EAS Build** | Expo's cloud service that compiles the app into a submittable iPhone app. |
| **wrangler** | The command-line remote control for everything Cloudflare. |
