# Altianly — Feature Gap Analysis & Build Plan

*Prepared: 2026-07-14*
*Sources: `Altianly_Feedback_Comparison.docx` (Section 6 — Health Metric Credibility), competitor review of **Mind Wobble** (mindwobble.com) and **Lumia** (lumiaapp.co), and the current Altianly codebase.*

---

## Why this document exists

The external feedback (`Altianly_Feedback_Comparison.docx`, Section 6) recommends Altianly stop leaning entirely on BMI — a crude ratio that can't distinguish muscle from fat — and add **other health measurements** (body-fat %, waist), reframing BMI as one screening input among several. It notes competitors have moved past single-number metrics (HRV, resting heart rate, composite readiness/health scores, recovery by muscle group).

This document combines that recommendation with a feature review of two adjacent wellness apps and lists **what's missing in Altianly** plus **a phased plan to build it**.

---

## Competitor feature inventory (pricing excluded, per request)

### Mind Wobble — AI wellness coaching, context-compounding
- **AI coaching** with structured frameworks (GROW, Limiting Beliefs, Growth Mindset, Adaptive); sessions end with a **summary + action items**; memory **compounds across sessions**
- **Daily check-ins** — mood, sleep, stress, exercise (up to 3×/day), all feeding the coach as context
- **Journaling** — 9 formats (CBT thought records, gratitude, free writing, etc.)
- **Goals** — build goals, break into steps, assign due dates, **visual timeline**, track progress
- **Self-discovery assessments** — Big Five personality, Values, Learning Style, Wheel of Life
- **Unified dashboard** (check-ins + journal + goals + coaching history in one place)
- **Tone insights** surfaced from journal entries
- Privacy: journal + coaching **encrypted at rest**, not sold, providers can't train on content
- **Blog/content library** (SEO) across sleep, anxiety, nutrition, mindfulness, fitness

### Lumia — all-in-one wellness
- **AI Coach** — text **+ voice mode**; **smart routing** (picks the right tool for the need); **AI writing** (rewrite/reframe thoughts); **build & save** routines with subtasks/goal steps
- **Emotional Support** — evidence-based exercises, resilience building
- **Growth Hub** — habits, goals, hobbies, tasks, progress, daily check-in
- **Serenity** — guided meditation, breathing exercises, daily affirmations, sleep stories
- **Health Tracker** — water, sleep, nutrition, weight, meal plan, recipes, energy, progress
- **Reading Tracker** — books, ideas, reading goals
- **Travel Hub** — trip planning, AI packing lists, itineraries, budget, checklists, travel wellness
- Mood check-ins; multi-language; SEO **"compare" pages** + blog/stories

---

## What Altianly already has

BMI + health insights · AI & rule-based workout plans (5 styles + Surprise Me) · questionnaire flow · workout logging + rest timer · workout history · nutrition (USDA search / barcode / NLP quick-add / calorie ring) · BMI & weight graphs · habits (native SQLite only — empty on web) · gamified badges + streaks · AI Trainer Chat · dark/cream themes · auth (email/password, guest, reset, delete).

---

## Gap list — what's missing (mapped to competitors)

### Tier A — Health measurements (what the feedback doc explicitly asks for; closest to Altianly's identity)
1. **Body-fat % + waist/hip measurements** — with waist-to-height ratio (a better mortality predictor than BMI)
2. **Additional body metrics** — weight is tracked, but no neck/chest/arm/thigh circumference and no progress-photo log
3. **Resting heart rate / HRV / sleep / steps** — via Apple Health / Google Health Connect (roadmap item H, still unbuilt)
4. **Composite "Readiness / Health Score"** — the single number both competitors lead with, to replace BMI-as-centerpiece
5. **Reframe BMI as one input among several** — the doc's Section 6 copy rewrite ("Normal range" not "Overweight"; screening-tool framing)

### Tier B — Daily wellness tracking (both competitors' core loop)
6. **Daily check-in** — mood, sleep, stress, energy (Altianly has none; habits are native-only and empty on web)
7. **Water intake tracking** (Lumia Health Tracker staple; pairs with existing nutrition)
8. **Habits on web** — currently returns empty; needs the AsyncStorage path that nutrition already uses

### Tier C — AI coach depth (Altianly's AI Chat is thin by comparison)
9. **Structured coaching frameworks + session summaries / action items** (Mind Wobble's GROW etc.)
10. **Context-compounding memory** — coach reading mood/goals/logs history (Altianly's chat starts fresh each time)
11. **Voice mode** for the coach (Lumia)

### Tier D — Goals & reflection
12. **Goals with steps, due dates, and a visual timeline** (beyond workout plans)
13. **Journaling** (0 formats today) — even a lightweight free-write + gratitude
14. **Self-discovery assessments** (Big Five / Wheel of Life) — lower priority, off-identity

### Tier E — Serenity / mind (further from fitness core)
15. Guided meditation, breathing, affirmations, sleep stories — Lumia's whole Serenity hub; large scope, weakest fit

### Not recommended (off-mission for a fitness app)
- Reading Tracker, Travel Hub — skip.

---

## Build plan (phased, identity-first)

Sequenced so the health-measurement work the doc explicitly called out lands first, since it fits tightest with what Altianly already is.

> **Precondition:** the docx also flags real defects (AI-plan crash, dead "Home" link, silent Save/Copy) as higher priority than *any* new feature. Those should stay ahead of this roadmap. (Most were addressed in the 2026-07-13 Tier 1 pass — verify before starting Phase 1.)

### Phase 1 — Richer Health Snapshot (replaces BMI-as-centerpiece) — ~1 sprint
- Extend `UserInput` / BMI types with `bodyFatPct`, `waist`, `hip`, `neck` → add **waist-to-height ratio** + optional **Navy body-fat estimate** in `src/services/bmi.ts`
- New optional inputs in the Health Snapshot flow (all skippable, per the doc's "keep it lightweight" note)
- Apply the doc's Section 6 copy rewrite ("Normal range" not "Overweight"; screening-tool framing + info tooltip)
- Body-measurements log + trend lines reusing `HistoryGraphScreen` patterns

### Phase 2 — Daily Check-in + Health Score — ~1–1.5 sprints
- Daily check-in card on Home: mood / sleep / stress / energy / water (new storage key `altianly_checkins`, AsyncStorage-first like nutrition)
- **Composite Health Score** blending BMI band, activity streak, check-in trends, and nutrition adherence → the single hero number both competitors lead with
- Fix habits on web (mirror nutrition's AsyncStorage path so the `database.web.ts` mock stops returning empty)

### Phase 3 — Smarter AI Coach — ~1.5 sprints
- Feed the coach real context (latest BMI, recent logs, check-ins, goals) in `buildPrompt` / ConversationalWorkout — the "compounds over time" differentiator
- Add a **GROW-style structured session** that ends with a summary + action items saved to history
- (Stretch) voice input via `expo-speech` / mic

### Phase 4 — Goals & Journaling — ~1 sprint
- General **Goals** (steps, due dates, visual timeline) separate from workout plans
- Lightweight **journaling** (free-write + gratitude + CBT thought record) with entries optionally feeding the coach

### Phase 5 (optional, off-core) — Serenity + Apple Health / Google Fit sync
- HealthKit / Health Connect for RHR / HRV / steps / sleep (needs a native EAS build — pairs with the App Store roadmap)
- Meditation / breathing only if the product decision is to broaden from "fitness" to "wellness"

---

## Recommendation

Start with **Phase 1**: it's exactly the "other health measurements" the feedback doc named, it's small, and it's on-identity. **Phase 2's composite Health Score** is the highest-leverage differentiator (it's what both competitors lead with) and a natural follow-on. Treat Tiers D–E as optional scope that depends on whether Altianly stays a focused fitness app or broadens into general wellness.
