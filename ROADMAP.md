# Altianly — Roadmap

*The plan forward, from today's working product to App Store launch and beyond. Last updated: July 3, 2026.*

---

## Where We Are Today

✅ Full-featured web app live at **altianly.com** — BMI, instant + AI workout plans (5 styles + Surprise Me), workout logging, nutrition tracking (search / barcode / plain-English quick add), habits, streaks & badges, AI Trainer chat with saveable plans
✅ Accounts with email/password, guest mode, password reset by email, account deletion
✅ Modern UI: bottom tabs, dashboard with calorie ring and weekly activity, warm light theme
✅ Server fully configured: AI, food database, auth, email — all live-tested
✅ Auto-deploy pipeline: push to GitHub → live in ~3 minutes
✅ App Store groundwork: bundle ID, permissions, privacy policy, EAS config, submission checklist

---

## Phase 1 — Launch on the App Store (target: 2–3 weeks)

The critical path. Full detail in `APP_STORE_CHECKLIST.md`.

| # | Step | Who | Effort |
|---|------|-----|--------|
| 1 | **Enroll in Apple Developer Program** ($99/yr, 1–2 day approval) — start now, everything else waits on it | You | 30 min + wait |
| 2 | ~~Verify a domain in Resend~~ **DONE 2026-07-04** — `altianly.com` live on Cloudflare DNS, Resend verified, `RESET_EMAIL_FROM` set; reset emails deliver to any address | — | ✅ |
| 3 | **First iOS build via EAS** (`eas build --platform ios`) and fix whatever native-only issues surface (SQLite paths, camera permissions flow, safe areas) | Claude + You | 1–2 days |
| 4 | **TestFlight round** — install on your real iPhone; test guest flow, account lifecycle, barcode scanning, AI plans on cellular | You | 2–3 days |
| 5 | **Store assets** — screenshots (iPhone 6.9" required; iPad too unless we set `supportsTablet: false`), description, keywords | You + Claude | Half day |
| 6 | **App Privacy questionnaire + demo account for the reviewer** | You + Claude | 1 hr |
| 7 | **Submit → review (24–48 hrs) → fix any rejection → live** | You | — |

**Decision needed:** keep iPad support (needs iPad screenshots + layout testing) or ship iPhone-only first? Recommendation: iPhone-only for v1.

---

## Phase 2 — Post-Launch Hardening (weeks 3–6)

Things that are fine for a demo but will bite real users:

1. **Habits don't work on web** — the web version quietly shows no habits (the database layer is stubbed out). Either port habits to AsyncStorage on web (like meals) or hide the feature on web.
2. **Sync more than BMI history** — today only BMI entries sync to the server; workouts, meals, and habits are device-only. Losing a phone means losing history. Extend the `/data` endpoint to cover all stores.
3. **End-to-end reset-flow test with a real account** (domain is verified; test the in-app flow with a non-owner email).
4. **Error visibility sweep** — we fixed invisible errors in auth; do the same audit for meal saves, plan saves, and habit logging.
5. **Rate limiting on the worker** — the AI and email endpoints are open; add basic per-IP limits so a bot can't burn the free-tier quotas.
6. **Session refresh** — sessions currently die after 10 hours of inactivity with a somewhat abrupt logout; consider 30-day refresh tokens.

---

## Phase 3 — Product Depth (months 2–3)

From the existing backlog, ordered by expected user impact:

| Priority | Feature | Notes |
|---|---|---|
| High | **One-tap "Mark Set Done"** in workout logging — checkbox per set, auto-advance | Biggest friction point in daily use |
| High | **Micro-interactions** — card entrance animations, set-completion pulse, haptics (`expo-haptics`) | Makes the app feel premium |
| High | **Streaming chat responses** — AI Trainer currently waits for the full answer; stream it word-by-word | Perceived speed |
| Medium | **Adaptive re-planning** — "Regenerate my plan based on my last 5 logged sessions" | The AI knows your logs; use them |
| Medium | **Nutrition quality score** — daily 1–100 score from evidence-based categories (the Bevel-inspired model in `bevel-nutrition-data-entry-analysis.md`) | Differentiator vs. plain calorie counters |
| Medium | **Badge celebrations** — animation on unlock, badge showcase | Retention |
| Low | **Better AI model** — try Llama 3-8B on Workers AI for plan quality (still free) | One-line change, test quality first |

---

## Phase 4 — Growth & Revenue (months 3–6)

- **Android release** — the codebase is already cross-platform; mostly a Play Store checklist exercise.
- **Apple Health / Google Health Connect sync** — pull steps, weight, sleep; the agent architecture (`HealthDataTalent`) was built for this.
- **Premium tier** (RevenueCat): free = 3 AI plans/month + core tracking; premium = unlimited AI, adaptive re-planning, nutrition score history.
- **Push notifications** — workout reminders, streak-preservation nudges (this was removed once; reintroduce deliberately and opt-in).
- **Social** — share workout cards to Instagram stories; friend streaks.

---

## Standing Principles

1. **Guest-first stays.** No feature may require an account unless it physically needs a server.
2. **Free tier of everything** until revenue exists: Cloudflare free plans cover current scale.
3. **Every session updates CHANGELOG.md and HANDOFF.md** — the project's memory.
4. **Verify against production**, not just localhost — the icon-font and auth-error bugs only existed in production builds.
5. **Docs for humans:** `HOW_IT_WORKS.md` (this system in plain English) stays current alongside the technical docs (`ARCHITECTURE.md`, `HANDOFF.md`).
