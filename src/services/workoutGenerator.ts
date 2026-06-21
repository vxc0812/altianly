import {
  StructuredWorkoutPlan,
  WorkoutDay,
  WorkoutExercise,
  ExerciseLevel,
  Lifestyle,
  TrainingSplit,
} from '../types'
import { pickExercise, MovementPattern } from '../data/exercises'

type LevelParams = {
  sets: number
  reps: string
  rest: number
  diff: ExerciseLevel
  lifestyle: Lifestyle
  age: number
}

function getLevelParams(level: ExerciseLevel, lifestyle: Lifestyle, age: number): LevelParams {
  switch (level) {
    case 'low':
      return {
        sets: 2,
        reps: '8-10',
        rest: 90,
        diff: 'low',
        lifestyle,
        age,
      }
    case 'medium':
      return {
        sets: 3,
        reps: '10-15',
        rest: 60,
        diff: 'medium',
        lifestyle,
        age,
      }
    case 'high':
      return {
        sets: 4,
        reps: '12-20',
        rest: 45,
        diff: 'high',
        lifestyle,
        age,
      }
  }
}

function difficultyForLevel(level: ExerciseLevel) {
  const map: Record<ExerciseLevel, 'light' | 'easy' | 'normal' | 'hard' | 'advanced'> = {
    low: 'easy',
    medium: 'normal',
    high: 'hard',
  }
  return map[level]
}

function hiitDifficulty(level: ExerciseLevel) {
  const map: Record<ExerciseLevel, 'light' | 'easy' | 'normal' | 'hard' | 'advanced'> = {
    low: 'light',
    medium: 'normal',
    high: 'hard',
  }
  return map[level]
}

function ex(
  pattern: MovementPattern,
  level: ExerciseLevel,
  sets: number,
  reps: string,
  rest: number,
  notes?: string,
  exclude?: string[]
): WorkoutExercise {
  const exercise = pickExercise(pattern, difficultyForLevel(level), exclude)
  return {
    name: exercise.name,
    sets,
    reps,
    restSeconds: rest,
    notes,
  }
}

function hiitEx(
  level: ExerciseLevel,
  sets: number,
  reps: string,
  rest: number,
  notes?: string,
  exclude?: string[]
): WorkoutExercise {
  const exercise = pickExercise('hiit', hiitDifficulty(level), exclude)
  return {
    name: exercise.name,
    sets,
    reps,
    restSeconds: rest,
    notes,
  }
}

function timedEx(
  name: string,
  workSeconds: number,
  restSeconds: number,
  rounds: number
): WorkoutExercise {
  return {
    name,
    sets: rounds,
    reps: `${workSeconds}s`,
    restSeconds,
    notes: `${workSeconds}s work / ${restSeconds}s rest`,
  }
}

function warmup(age: number): string {
  if (age >= 50) return '8 min: arm circles, leg swings, cat-cow, hip circles, bodyweight half-squats, dynamic thoracic rotations'
  if (age >= 40) return '6 min: jumping jacks, arm circles, leg swings, torso twists, bodyweight squats'
  return '5 min: light jog in place, arm circles, leg swings, torso twists, bodyweight squats, inchworms'
}

function cooldown(age: number): string {
  if (age >= 50) return '6 min: standing hamstring stretch, quad stretch, chest opener, child\'s pose, seated spinal twist, deep breathing'
  return '5 min: static stretching — hamstrings, quads, chest, triceps, glute hold (20s each)'
}

function buildDay(name: string, exercises: WorkoutExercise[]): WorkoutDay {
  return { day: 0, focus: name, exercises }
}

function assignDays(days: WorkoutDay[]): WorkoutDay[] {
  return days.map((d, i) => ({ ...d, day: i + 1 }))
}

// ── Full Body ──────────────────────────────────────────────────

function fullBodyPlan(p: LevelParams): WorkoutDay[] {
  const { sets, reps, rest, diff } = p
  const used: string[] = []

  const push = () => ex('push_h', diff, sets, reps, rest, 'Slow and controlled', used)
  const squat = () => ex('squat', diff, sets, reps, rest, 'Full range of motion', used)
  const hinge = () => ex('hinge', diff, sets, reps, rest, 'Squeeze glutes at top', used)
  const coreExt = () => ex('core_anti_ext', diff, sets, reps, rest, 'Keep core braced', used)
  const pull = () => ex('pull', diff, sets, reps, rest, undefined, used)
  const coreRot = () => ex('core_anti_rot', diff, sets, reps, rest, 'Keep hips stable', used)
  const h = () => hiitEx(diff, sets, '30s', rest, 'Maximum effort', used)
  const flex = () => ex('core_flexion', diff, sets, reps, rest, 'Control the negative', used)

  return [
    buildDay('Full Body A — Compound', [
      push(),
      squat(),
      hinge(),
      coreExt(),
      pull(),
    ]),
    buildDay('Full Body B — Unilateral & Core', [
      ex('squat', diff, sets, reps, rest, 'One leg at a time', [...used, 'squat', 'split-squat']),
      ex('hinge', p.diff, sets, reps, rest, 'Single-leg variation', [...used, 'glute-bridge', 'single-glute-bridge']),
      coreRot(),
      flex(),
      h(),
    ]),
    buildDay('Full Body C — Circuit', [
      timedEx('Circuit: work 40s / rest 20s', 40, 20, 3),
      push(),
      ex('squat', p.diff, sets, '40s', 20, 'Fast, controlled', [...used, 'squat']),
      coreExt(),
      h(),
    ]),
  ]
}

// ── Upper / Lower ──────────────────────────────────────────────

function upperLowerPlan(p: LevelParams): WorkoutDay[] {
  const { sets, reps, rest, diff } = p
  const used: string[] = []

  return [
    buildDay('Upper A — Push Emphasis', [
      ex('push_h', diff, sets, reps, rest, 'Full range of motion', used),
      ex('push_v', diff, sets, reps, rest, 'Target shoulders', used),
      ex('pull', diff, sets, reps, rest, 'Squeeze back', used),
      ex('core_anti_ext', diff, sets, reps, rest, 'Hold steady', used),
    ]),
    buildDay('Lower A — Squat Emphasis', [
      ex('squat', diff, sets, reps, rest, 'Depth over speed', used),
      ex('hinge', diff, sets, reps, rest, 'Hip drive', used),
      ex('squat', diff, sets, reps, rest, 'Unilateral variation', [...used, 'squat']),
      ex('core_anti_rot', diff, sets, reps, rest, 'Keep hips square', used),
    ]),
    buildDay('Upper B — Pull & Core', [
      ex('pull', diff, sets, reps, rest, 'Focus on mind-muscle connection', used),
      ex('push_h', diff, sets, reps, rest, 'Explosive on the way up', used),
      ex('core_flexion', diff, sets, reps, rest, 'Slow negatives', used),
      hiitEx(diff, sets, reps, rest, 'Finisher: max effort', used),
    ]),
    buildDay('Lower B — Hinge & HIIT Finisher', [
      ex('hinge', diff, sets, reps, rest, 'Posterior chain focus', used),
      ex('squat', diff, sets, reps, 45, 'Tempo: 3-0-2', ['box-squat', 'partial-squat', ...used]),
      ex('hinge', diff, sets, reps, rest, 'Unilateral', [...used, 'glute-bridge', 'single-glute-bridge']),
      hiitEx(diff, 3, '30s', 30, 'Three rounds: 30s work / 30s rest', used),
    ]),
  ]
}

// ── Push / Pull / Legs ─────────────────────────────────────────

function pplPlan(p: LevelParams): WorkoutDay[] {
  const { sets, reps, rest, diff } = p
  const used: string[] = []

  return [
    buildDay('Push — Chest, Shoulders, Triceps', [
      ex('push_h', diff, sets, reps, rest, 'Main compound', used),
      ex('push_h', diff, sets, reps, rest, 'Different angle', [...used, 'wall-pushup', 'incline-pushup', 'knee-pushup']),
      ex('push_v', diff, sets, reps, rest, 'Shoulder emphasis', used),
      ex('core_anti_ext', diff, sets, reps, rest, 'Stability', used),
    ]),
    buildDay('Pull — Back, Rear Delts, Biceps', [
      ex('pull', diff, sets, reps, rest, 'Compound pull', used),
      ex('pull', diff, sets, reps, rest, 'Width focus', [...used, 'scap-retract', 'supermans']),
      ex('core_anti_rot', diff, sets, reps, rest, 'Oblique work', used),
      hiitEx(diff, sets, reps, rest, 'Cardio finisher', used),
    ]),
    buildDay('Legs — Quads, Glutes, Hamstrings, Calves', [
      ex('squat', diff, sets, reps, rest, 'Main compound', used),
      ex('hinge', diff, sets, reps, rest, 'Posterior chain', used),
      ex('squat', diff, sets, reps, rest, 'Unilateral', [...used, 'squat']),
      ex('core_flexion', diff, sets, reps, rest, 'Core finisher', used),
    ]),
  ]
}

// ── Bro Split ──────────────────────────────────────────────────

function broSplitPlan(p: LevelParams): WorkoutDay[] {
  const { sets, reps, rest, diff } = p
  const used: string[] = []

  return [
    buildDay('Chest & Triceps', [
      ex('push_h', diff, sets, reps, rest, 'Chest focus', used),
      ex('push_h', diff, sets, reps, rest, 'Upper chest', [...used, 'wall-pushup', 'incline-pushup', 'knee-pushup']),
      ex('push_h', diff, sets, reps, rest, 'Tricep focus', [...used, 'tricep-dip']),
      ex('core_anti_ext', diff, sets, reps, rest, 'Core stability', used),
    ]),
    buildDay('Back & Rear Delts', [
      ex('pull', diff, sets, reps, rest, 'Main pulling', used),
      ex('pull', diff, sets, reps, rest, 'Width emphasis', [...used, 'scap-retract', 'supermans']),
      ex('pull', diff, sets, reps, rest, 'Rear delts', ['inverted-row', 'wide-row', ...used]),
      hiitEx(diff, sets, reps, rest, 'Conditioning', used),
    ]),
    buildDay('Shoulders & Abs', [
      ex('push_v', diff, sets, reps, rest, 'Overhead focus', used),
      ex('push_v', diff, sets, reps, rest, 'Variation', [...used, 'pike-pushup']),
      ex('core_anti_ext', diff, sets, reps, rest, 'Front plank', used),
      ex('core_anti_rot', diff, sets, reps, rest, 'Obliques', used),
      ex('core_flexion', diff, sets, reps, rest, 'Lower abs', used),
    ]),
    buildDay('Legs', [
      ex('squat', diff, sets, reps, rest, 'Quads focus', used),
      ex('hinge', diff, sets, reps, rest, 'Glutes focus', used),
      ex('squat', diff, sets, reps, rest, 'Unilateral', [...used, 'squat']),
      ex('hinge', diff, sets, reps, rest, 'Hamstrings', [...used, 'glute-bridge', 'single-glute-bridge']),
      ex('core_flexion', diff, sets, reps, rest, 'Core finisher', used),
    ]),
    buildDay('Full Body HIIT', [
      hiitEx(diff, 3, '40s', 20, 'Round 1: 40s work / 20s rest — max effort', used),
      ex('push_h', diff, 3, '40s', 20, 'Round 2', used),
      ex('squat', diff, 3, '40s', 20, 'Round 2', [...used, 'squat']),
      hiitEx(diff, 3, '40s', 20, 'Round 3', [...used]),
    ]),
  ]
}

// ── Notes ──────────────────────────────────────────────────────

function planNotes(level: ExerciseLevel, split: TrainingSplit, age: number): string {
  const notes: string[] = []

  if (level === 'low') {
    notes.push('Rest 48h between sessions. Focus on form over speed. Progress by adding 1 rep per set each week.')
  } else if (level === 'medium') {
    notes.push('Increase difficulty by slowing the negative to 3-4 seconds. Add one set per exercise every 2 weeks.')
  } else {
    notes.push('Use advanced variations when 15+ reps are easy. Add a fourth set for lagging muscle groups. Try Tabata (20:10) for HIIT days.')
  }

  if (split === 'full_body') {
    notes.push('Full body 3x/week with at least one rest day between sessions.')
  } else if (split === 'upper_lower') {
    notes.push('Upper/Lower split: 4 days/week. Rest day after day 2 and day 4.')
  } else if (split === 'ppl') {
    notes.push('PPL: Run as a 3-day or 6-day cycle. Rest day after each full rotation.')
  } else {
    notes.push('Bro split: 5 days on, 2 days rest. Prioritize recovery and sleep.')
  }

  if (age >= 50) {
    notes.push('Extended warm-up and cool-down recommended due to age. Listen to your joints.')
  }

  if (level === 'low') {
    notes.push('Progression target: increase reps by 1-2 each session. When you hit the upper range of your rep target for 2 consecutive sessions, advance to the next exercise variation.')
  } else if (level === 'medium') {
    notes.push('Progression target: once you can complete all sets at the top of the rep range, reduce rest by 15s or advance to a harder variation.')
  } else {
    notes.push('Progression target: incorporate Tabata protocols (20s work / 10s rest) for HIIT days. Track rep counts — aim for 30-50% drop from round 1 to round 8.')
  }

  return notes.join('\n')
}

// ── Main Generator ─────────────────────────────────────────────

export function generateWorkoutPlan(params: {
  age: number
  gender: string
  bmi: number
  evaluation: string
  lifestyle: Lifestyle
  exerciseLevel: ExerciseLevel
  split: TrainingSplit
}): StructuredWorkoutPlan {
  const { age, exerciseLevel, lifestyle, split, evaluation, gender } = params
  const p = getLevelParams(exerciseLevel, lifestyle, age)

  const splitName: Record<TrainingSplit, string> = {
    full_body: 'Full Body',
    upper_lower: 'Upper/Lower',
    ppl: 'Push/Pull/Legs',
    bro_split: 'Bro Split',
  }

  const dayGenerators: Record<TrainingSplit, (p: LevelParams) => WorkoutDay[]> = {
    full_body: fullBodyPlan,
    upper_lower: upperLowerPlan,
    ppl: pplPlan,
    bro_split: broSplitPlan,
  }

  const rawDays = dayGenerators[split](p)
  const days = assignDays(rawDays)

  return {
    name: `Week 1 — ${splitName[split]} (${exerciseLevel})`,
    days,
    warmup: warmup(age),
    cooldown: cooldown(age),
    notes: planNotes(exerciseLevel, split, age),
  }
}
