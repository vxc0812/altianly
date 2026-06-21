# Altianly Improvement Plan

This document synthesises insights from the **RazFit** fitness app** and applies them to the existing Altianly BMI calculator** (https://altianly.vishhalchopra.workers.dev/).  It is intended as a practical action plan for designers, developers, and product owners who wish to transform Altianly from a single‑screen calculator into a more engaging, data‑driven health companion.

---

## 1. Quick snapshot of Altianly (as of 2026‑06‑17)
| Feature | Current state | Notes |
|---------|---------------|-------|
| Core function | BMI calculation (metric/imperial, gender, age) | Very basic UI – input boxes, a single button, a result card |
| Persistence | None | Calculations not stored; page refresh erases history |
| Styling | Minimal, no branding | Plain Layout, no visual cues |
| Interactivity | Static | No animations, no guidance |
| Accessibility | Unknown | No ARIA, not tested |
| Analytics | None | No user behavior tracking |
| External links | None | No resources or next‑steps |

---

## 2. What RazFit does well (high‑level takeaways)
RazFit is a short‑form exercise app that reduces friction for regular movement.  Key practices (derived from the website content) that contribute to its effectiveness:

1. **Ultra‑short sessions** – 1‑10 min workouts lower effort barriers.
2. **Context‑aware scheduling** – Users pick a time slice and RazFit fits a plan in.
3. **Progress visualization** – Dashboards, badges, and streaks give tangible evidence of habit formation.
4. **Gamification** – 32 badges incentivise continual engagement.
5. **Personalization** – Adaptive exercise difficulty based on user level.
6. **Clear, bite‑size UI** – Minimal text, iconography, and step‑by‑step instruction.
7. **Free trial + freemium hook** – No‑cost trial lowers abandonment.
8. **Trust signals** – Security badges, no‑equipment promise, and straightforward cancellation.

These elements address user needs identified on the RazFit landing page:
- *No clear time* – They offer 1‑min options.
- *No easy restart* – The plan is always a short session you can pick up again.
- *Too many decisions* – They curate the next move automatically.

---

## 3. Mapping RazFit insights to Altianly
| RazFit principle | Altianly gap | Suggested improvement |
|------------------|-------------|-----------------------|
| 1‑10 min session idea | Only a single static calculator | Re‑frame the BMI check as a **quick health snapshot**.  User can choose a short “snapshot” metric‑check (1‑min) and then get a brief set of next‑step suggestions.
| Scheduling & context | No scheduling | Add a *“Schedule a reminder”* button that lets users set a time to be nudged back to the page (e.g., via email/SMS/Push). |
| Progress & badges | None | Introduce a **progress board**: every time a user calculates BMI, a tiny badge appears (e.g., “Checked BMI”, “Stayed consistent 1‑day”).  A simple streak counter can be shown.
| Personalization | Single calculation | When a user records their data, suggest a *personal health profile*: body‑mass index zone, recommended activity level, diet tip, etc. Use gender, age, and BMI for a quick profile.
| Minimal UI | Plain form | Replace text fields with labelled sliders or dropdowns for *height* & *weight*, use a gender toggle, and show live BMI preview.
| Gamification | No gamification | Offer a **badge for each milestone**: e.g., “First BMI check”, “Checked 7 times in a week”, “Reached target BMI”, etc.
| Free trial/freemium | Already free | No cost, but we can add a *“Get a free nutrition plan”* and *“Unlock suggestions”* after a few uses. Monetization is optional.
| Trust signals | None | Add a small *Privacy* notice, *Secure* lock icon, and note that data is stored locally only (use localStorage). |
| Clear call‑to‑action | None | A prominent **“Get My Health Summary”** button that shows a modal with results, tips, and next steps.

---

## 4. Feature‑level recommendations
### 4.1 Core Rapid‑Health Snapshot
- **Input**: Gender toggle, age field, weight (spinner), height (slider).  All fields validated instantly.
- **Action Button**: \“Check BMI\” – when clicked, compute BMI, display a stylised result card.
- **Result card** gives:
  - BMI value rounded to one decimal
  - Current category (Under‑weight, Normal, Pre‑obesity, Obesity) with color highlight
  - Quick “What this means” blurb
  - Next‑step suggestions (exercise plan, diet tip, hydration reminder)
- **Badge** appears under the card when first time or after 5 calculations.

### 4.2 Progress Tracker
- On page, show a **mini streak** counter (days ago you checked) and a simple progress bar.
- Optionally store user’s previous BMI values in browser `localStorage` for short‑term history.
- Provide a *Show History* modal that lists last 7 BMI checks with dates.

### 4.3 Reminders & Scheduling
- Add a **“Set Reminder”** toggle that uses the Web Notification API or browser clock to ping the user after a chosen interval (e.g., daily 7 am).  Ask for permission once.
- Optionally integrate with Google Calendar via OAuth for registered users (requires backend).

### 4.4 Gamified Badges
- Define a small set (5‑7) badges:
  1. “First Check” – after first use.
  2. “Consistency 3×” – after 3 separate days of use.
  3. “Weekly User” – after 7 checks.
  4. “Goal‑Achiever” – if BMI falls into target range.
- Store badge data in `localStorage` and show on a badge carousel on the page.

### 4.5 Personalised Action Plan
- After calculating BMI, offer a **personal action card**:
  - If BMI < 18.5: nutritional recommendation “Eat nutrient‑dense foods, small frequent meals”.
  - 18.5–24.9: “Maintain” – light cardio + balanced diet.
  - 25–29.9: “Slight weight loss” suggestion – moderate cardio + calorie deficit.
  - ≥ 30: “Weight‑loss plan” – more intensive cardio + consult doctor.
- Provide links or quick buttons to *“Get workout routine”* or *“Get diet plan”* (these could link to external sites or internal resources).

### 4.6 UI & Accessibility
- Use a responsive CSS framework (e.g., Tailwind CSS) to ensure mobile friendliness.
- Provide large tappable icons, high‑contrast themes, and ARIA labels.
- Ensure keyboard navigation (Tab order for form fields).
- Provide `prefers‑color‑scheme` support for light/dark mode.
- Use semantic HTML (`<form>`, `<label>`, `<details>`, etc.).

### 4.7 Analytics & Feedback
- Integrate lightweight analytics (e.g., Plausible) to track:
  - Page views, unique visitors
  - Interaction counts (calculations, reminders, badge unlocks)
- Add a **Feedback modal** after a calculation asking “Did this help you?” with thumbs up/down.
- Optionally allow anonymous issue reporting.

---

## 5. Technical roadmap
| Phase | Milestone | Time estimate | Dependencies |
|-------|-----------|---------------|--------------|
| 1 | Refactor markup to semantic + responsive design | 2 days | Tailwind CSS or similar |
| 2 | Implement BMI calculation logic + real‑time validation | 1 day | None |
| 3 | Badge system & progress tracker in localStorage | 1 day | None |
| 4 | Reminder & notification handler | 2 days | Browser Notification API |
| 5 | Personalized action cards logic | 2 days | BMI threshold mapping |
| 6 | Gamification carousel and modal UI | 1 day | JS framework or vanilla |
| 7 | Accessibility audit & fixes | 1 day | Lighthouse/axe |
| 8 | Analytics integration (Plausible) | 0.5 day | Plausible site mask |
| 9 | Manual QA & bug fixes | 2 days | Testers |
|–––|–––|––––––––|–––––––|
| **Total** | – | ≈ 11.5 days |

All changes rely on client‑side storage, so no backend modifications are required unless calendar sync is desired.

---

## 6. Acceptance criteria
1. **BMI calculation** works accurately for both metric and imperial units.
2. A **result card** appears instantly, showing BMI value, category, and a text summary.
3. The **badge system** updates automatically after the configured thresholds are met.
4. **Reminders** can be scheduled and are fired via browser notifications.
5. UI is responsive on mobile, tablet, and desktop with at least 80 % Lighthouse accessibility score.
6. **Analytics events** fire for each calculation and badge unlock.

---

## 7. Suggested next steps
1. **Stakeholder review** – Present this plan in a 30‑min session.
2. **Prototype** – Build a clickable prototype in Figma or similar to refine UI decisions.
3. **User testing** – Recruit 5‑10 participants for a 1‑hour think‑aloud session focusing on the “quick snapshot” flow.
4. **Develop & deploy** – Using the roadmap above, push to a new branch `feature/improved-altianly`.
5. **Iterate** based on analytics and user feedback.

---

## 8. References
- RazFit landing page: https://razfit.app/
- Altianly current page: https://altianly.vishhalchopra.workers.dev/

---

*Prepared by Feynman (research‑first AI agent) – 2026‑06‑17*