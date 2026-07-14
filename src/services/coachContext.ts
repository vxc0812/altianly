import { getBMIHistory, getWorkoutLogs } from './storage'
import { getRecentCheckins, checkinDateStr } from './checkins'
import { getMealsForDate, getDailyTotals, DEFAULT_RDI } from './nutrition'
import { computeHealthScore } from './healthScore'
import type { WorkoutLog, BMIEvaluation } from '../types'

// Builds a compact "client snapshot" the AI coach can reference so every reply
// is grounded in the user's real data (BMI, body composition, activity,
// check-ins, nutrition, Health Score) instead of starting from scratch. This is
// the "a coach that actually knows you" differentiator — it reuses everything
// Phases 1–2 already track. Returns null when there's nothing to say.

const evalLabel: Record<BMIEvaluation, string> = {
  underweight: 'below typical range',
  normal: 'normal range',
  overweight: 'above typical range',
  obese: 'well above typical range',
}

function workoutsThisWeek(logs: WorkoutLog[]): number {
  const now = new Date()
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7))
  const days = new Array(7).fill(false)
  for (const log of logs) {
    const d = new Date(log.timestamp)
    const diff = Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() - monday.getTime()) / 86400000)
    if (diff >= 0 && diff < 7) days[diff] = true
  }
  return days.filter(Boolean).length
}

export async function buildCoachContext(): Promise<string | null> {
  const [bmiHistory, logs, checkins] = await Promise.all([
    getBMIHistory(),
    getWorkoutLogs(),
    getRecentCheckins(7),
  ])

  const lines: string[] = []
  const latest = bmiHistory[0]

  if (latest) {
    lines.push(`Age ${latest.age}, ${latest.gender}`)
    lines.push(`BMI ${latest.bmi} (${evalLabel[latest.evaluation]})`)

    const comp: string[] = []
    if (typeof latest.bodyFatPct === 'number') comp.push(`body fat ~${latest.bodyFatPct}%`)
    if (typeof latest.waistToHeightRatio === 'number') comp.push(`waist-to-height ${latest.waistToHeightRatio.toFixed(2)}`)
    if (comp.length) lines.push(comp.join(', '))

    // Weight trend from the oldest-to-newest span in history.
    if (bmiHistory.length >= 2) {
      const earliest = bmiHistory[bmiHistory.length - 1]
      const delta = Math.round((latest.weightLbs - earliest.weightLbs) * 10) / 10
      const dir = delta < 0 ? `down ${Math.abs(delta)} lbs` : delta > 0 ? `up ${delta} lbs` : 'steady'
      lines.push(`Weight ${latest.weightLbs} lbs (trend: ${dir} over ${bmiHistory.length} check-ins)`)
    } else {
      lines.push(`Weight ${latest.weightLbs} lbs`)
    }
  }

  const week = workoutsThisWeek(logs)
  lines.push(`Workouts logged this week: ${week}`)
  if (logs[0]) {
    const daysAgo = Math.round((Date.now() - logs[0].timestamp) / 86400000)
    lines.push(`Last workout: ${logs[0].focus || 'session'} ${daysAgo <= 0 ? 'today' : `${daysAgo}d ago`}`)
  }

  const c = checkins[0]
  if (c && c.date === checkinDateStr()) {
    const parts: string[] = []
    if (typeof c.mood === 'number') parts.push(`mood ${c.mood}/5`)
    if (typeof c.energy === 'number') parts.push(`energy ${c.energy}/5`)
    if (typeof c.stress === 'number') parts.push(`stress ${c.stress}/5`)
    if (typeof c.sleepHours === 'number') parts.push(`slept ${c.sleepHours}h`)
    if (parts.length) lines.push(`Today's check-in: ${parts.join(', ')}`)
  }

  // Today's nutrition + nutrition-logging consistency for the Health Score.
  let nutritionDaysLogged = 0
  for (let i = 0; i < 7; i++) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const meals = await getMealsForDate(checkinDateStr(d))
    if (meals.some((m) => m.entries.length > 0)) nutritionDaysLogged++
  }
  const todayTotals = getDailyTotals(await getMealsForDate(checkinDateStr()))
  if (todayTotals.calories > 0) lines.push(`Today's calories: ${todayTotals.calories} / ${DEFAULT_RDI.calories}`)

  const score = computeHealthScore({
    bmi: latest?.bmi ?? null,
    hasWorkoutData: logs.length > 0,
    workoutsThisWeek: week,
    checkins,
    nutritionDaysLogged,
  })
  if (score) lines.push(`Health Score: ${score.score}/100 (${score.label})`)

  if (lines.length === 0) return null
  return lines.map((l) => `- ${l}`).join('\n')
}
