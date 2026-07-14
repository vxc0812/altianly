import type { DailyCheckin, HealthScoreComponent, HealthScoreResult } from '../types'

// A single composite Health Score (0–100) — the "one number" both competitor
// apps lead with. It's the equal-weighted mean of whichever component signals
// have data, so it degrades gracefully for new users (BMI only) and gets richer
// as they log workouts, check-ins, and meals. Each component is 0–100.

const clamp = (n: number): number => Math.max(0, Math.min(100, n))

/** BMI band → score. Full marks inside the healthy range, tapering outside. */
export function bmiSubscore(bmi: number): number {
  if (bmi >= 18.5 && bmi <= 24.9) return 100
  if (bmi < 18.5) return clamp(100 - (18.5 - bmi) * 10)
  return clamp(100 - (bmi - 24.9) * 6)
}

/** Workouts logged this week → score, with a gentle floor so 0 isn't punishing. */
function activitySubscore(workoutsThisWeek: number): number {
  return clamp(40 + workoutsThisWeek * 15)
}

function normalize1to5(avg: number): number {
  return clamp(((avg - 1) / 4) * 100)
}

function sleepSubscore(hours: number): number {
  if (hours >= 7 && hours <= 9) return 100
  if (hours < 7) return clamp(100 - (7 - hours) * 20)
  return clamp(100 - (hours - 9) * 15)
}

/** Wellbeing from recent check-ins — mean of whichever signals were logged. */
function wellbeingSubscore(checkins: DailyCheckin[]): number | null {
  const avgOf = (pick: (c: DailyCheckin) => number | undefined): number | null => {
    const vals = checkins.map(pick).filter((v): v is number => typeof v === 'number')
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  }
  const parts: number[] = []
  const mood = avgOf((c) => c.mood)
  if (mood !== null) parts.push(normalize1to5(mood))
  const energy = avgOf((c) => c.energy)
  if (energy !== null) parts.push(normalize1to5(energy))
  const stress = avgOf((c) => c.stress)
  if (stress !== null) parts.push(normalize1to5(6 - stress)) // invert: high stress = low score
  const sleep = avgOf((c) => c.sleepHours)
  if (sleep !== null) parts.push(sleepSubscore(sleep))
  if (parts.length === 0) return null
  return parts.reduce((a, b) => a + b, 0) / parts.length
}

export function scoreLabel(score: number): string {
  if (score >= 80) return 'Excellent'
  if (score >= 65) return 'Good'
  if (score >= 45) return 'Fair'
  return 'Needs attention'
}

export interface HealthScoreInputs {
  bmi?: number | null
  hasWorkoutData?: boolean
  workoutsThisWeek?: number
  checkins?: DailyCheckin[]
  nutritionDaysLogged?: number | null // days with meals in the last 7
}

export function computeHealthScore(inputs: HealthScoreInputs): HealthScoreResult | null {
  const components: HealthScoreComponent[] = []

  if (typeof inputs.bmi === 'number') {
    components.push({ key: 'bmi', label: 'BMI', score: Math.round(bmiSubscore(inputs.bmi)) })
  }
  if (inputs.hasWorkoutData) {
    components.push({ key: 'activity', label: 'Activity', score: Math.round(activitySubscore(inputs.workoutsThisWeek ?? 0)) })
  }
  if (inputs.checkins && inputs.checkins.length) {
    const wb = wellbeingSubscore(inputs.checkins)
    if (wb !== null) components.push({ key: 'wellbeing', label: 'Wellbeing', score: Math.round(wb) })
  }
  if (typeof inputs.nutritionDaysLogged === 'number') {
    components.push({ key: 'nutrition', label: 'Nutrition', score: Math.round(clamp((inputs.nutritionDaysLogged / 7) * 100)) })
  }

  if (components.length === 0) return null
  const score = Math.round(components.reduce((a, c) => a + c.score, 0) / components.length)
  return { score, label: scoreLabel(score), components }
}
