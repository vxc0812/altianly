import { Difficulty } from '../types'

export type MovementPattern =
  | 'push_h'
  | 'push_v'
  | 'pull'
  | 'squat'
  | 'hinge'
  | 'core_anti_ext'
  | 'core_anti_rot'
  | 'core_flexion'
  | 'hiit'
  | 'cardio'

export interface ExerciseDef {
  id: string
  name: string
  movementPattern: MovementPattern
  type: 'strength' | 'hiit' | 'stretching' | 'cardio'
  focus: 'upper-body' | 'lower-body' | 'full-body' | 'abs'
  difficulty: Difficulty
  tempo?: string
}

export const EXERCISES: ExerciseDef[] = [
  // ── Push Horizontal ──────────────────────────────────────────
  { id: 'wall-pushup', name: 'Wall Push-ups', movementPattern: 'push_h', type: 'strength', focus: 'upper-body', difficulty: 'light', tempo: '2-0-2' },
  { id: 'incline-pushup', name: 'Incline Push-ups', movementPattern: 'push_h', type: 'strength', focus: 'upper-body', difficulty: 'light', tempo: '2-0-2' },
  { id: 'knee-pushup', name: 'Knee Push-ups', movementPattern: 'push_h', type: 'strength', focus: 'upper-body', difficulty: 'easy', tempo: '2-0-2' },
  { id: 'pushup', name: 'Push-ups', movementPattern: 'push_h', type: 'strength', focus: 'upper-body', difficulty: 'normal', tempo: '2-0-2' },
  { id: 'wide-pushup', name: 'Wide Push-ups', movementPattern: 'push_h', type: 'strength', focus: 'upper-body', difficulty: 'normal', tempo: '2-0-2' },
  { id: 'decline-pushup', name: 'Decline Push-ups', movementPattern: 'push_h', type: 'strength', focus: 'upper-body', difficulty: 'hard', tempo: '3-0-2' },
  { id: 'diamond-pushup', name: 'Diamond Push-ups', movementPattern: 'push_h', type: 'strength', focus: 'upper-body', difficulty: 'hard', tempo: '3-0-2' },
  { id: 'pike-pushup', name: 'Pike Push-ups', movementPattern: 'push_v', type: 'strength', focus: 'upper-body', difficulty: 'hard', tempo: '3-0-2' },
  { id: 'archer-pushup', name: 'Archer Push-ups', movementPattern: 'push_h', type: 'strength', focus: 'upper-body', difficulty: 'advanced', tempo: '3-0-3' },
  { id: 'one-arm-pushup', name: 'One-Arm Push-ups', movementPattern: 'push_h', type: 'strength', focus: 'upper-body', difficulty: 'advanced', tempo: '3-0-3' },
  { id: 'handstand-hold', name: 'Handstand Hold against Wall', movementPattern: 'push_v', type: 'strength', focus: 'upper-body', difficulty: 'advanced', tempo: 'hold' },
  { id: 'tricep-dip', name: 'Tricep Dips on Chair', movementPattern: 'push_h', type: 'strength', focus: 'upper-body', difficulty: 'normal', tempo: '2-0-2' },
  { id: 'single-leg-dip', name: 'Single-Leg Tricep Dips', movementPattern: 'push_h', type: 'strength', focus: 'upper-body', difficulty: 'hard', tempo: '2-0-2' },

  // ── Pull ─────────────────────────────────────────────────────
  { id: 'scap-retract', name: 'Scapular Retractions', movementPattern: 'pull', type: 'stretching', focus: 'upper-body', difficulty: 'light' },
  { id: 'supermans', name: 'Superman Holds', movementPattern: 'pull', type: 'strength', focus: 'full-body', difficulty: 'easy', tempo: '2-1-2' },
  { id: 'cobra', name: 'Cobra Pose', movementPattern: 'pull', type: 'stretching', focus: 'upper-body', difficulty: 'light' },
  { id: 'tywaise', name: 'T-Y-W Arm Raises', movementPattern: 'pull', type: 'strength', focus: 'upper-body', difficulty: 'easy', tempo: '2-0-2' },
  { id: 'inverted-row', name: 'Inverted Rows (under table)', movementPattern: 'pull', type: 'strength', focus: 'upper-body', difficulty: 'normal', tempo: '2-0-2' },
  { id: 'wide-row', name: 'Wide Inverted Rows', movementPattern: 'pull', type: 'strength', focus: 'upper-body', difficulty: 'hard', tempo: '2-0-2' },
  { id: 'face-pull', name: 'Bandless Face Pulls', movementPattern: 'pull', type: 'strength', focus: 'upper-body', difficulty: 'easy', tempo: '2-0-2' },

  // ── Squat ────────────────────────────────────────────────────
  { id: 'box-squat', name: 'Box Squats to Chair', movementPattern: 'squat', type: 'strength', focus: 'lower-body', difficulty: 'light', tempo: '2-0-2' },
  { id: 'partial-squat', name: 'Partial Squats', movementPattern: 'squat', type: 'strength', focus: 'lower-body', difficulty: 'easy', tempo: '2-0-2' },
  { id: 'squat', name: 'Bodyweight Squats', movementPattern: 'squat', type: 'strength', focus: 'lower-body', difficulty: 'normal', tempo: '2-0-2' },
  { id: 'cossack-squat', name: 'Cossack Squats', movementPattern: 'squat', type: 'strength', focus: 'lower-body', difficulty: 'normal', tempo: '2-0-2' },
  { id: 'split-squat', name: 'Split Squats', movementPattern: 'squat', type: 'strength', focus: 'lower-body', difficulty: 'normal', tempo: '2-0-2' },
  { id: 'bulgarian-split-squat', name: 'Bulgarian Split Squats', movementPattern: 'squat', type: 'strength', focus: 'lower-body', difficulty: 'hard', tempo: '3-0-2' },
  { id: 'jump-squat', name: 'Jump Squats', movementPattern: 'squat', type: 'hiit', focus: 'lower-body', difficulty: 'hard' },
  { id: 'pistol-squat', name: 'Pistol Squats (assisted)', movementPattern: 'squat', type: 'strength', focus: 'lower-body', difficulty: 'advanced', tempo: '3-0-3' },

  // ── Hinge ────────────────────────────────────────────────────
  { id: 'glute-bridge', name: 'Glute Bridges', movementPattern: 'hinge', type: 'strength', focus: 'lower-body', difficulty: 'light', tempo: '2-1-2' },
  { id: 'single-glute-bridge', name: 'Single-Leg Glute Bridges', movementPattern: 'hinge', type: 'strength', focus: 'lower-body', difficulty: 'easy', tempo: '2-1-2' },
  { id: 'hip-thrust', name: 'Hip Thrusts (floor)', movementPattern: 'hinge', type: 'strength', focus: 'lower-body', difficulty: 'normal', tempo: '2-1-2' },
  { id: 'reverse-hyper', name: 'Reverse Hypers (floor)', movementPattern: 'hinge', type: 'strength', focus: 'lower-body', difficulty: 'normal', tempo: '2-0-2' },
  { id: 'donkey-kick', name: 'Donkey Kicks', movementPattern: 'hinge', type: 'strength', focus: 'lower-body', difficulty: 'easy', tempo: '2-0-2' },
  { id: 'step-up', name: 'Step-ups (chair/stair)', movementPattern: 'hinge', type: 'strength', focus: 'lower-body', difficulty: 'normal', tempo: '2-0-2' },
  { id: 'lunge', name: 'Forward Lunges', movementPattern: 'hinge', type: 'strength', focus: 'lower-body', difficulty: 'normal', tempo: '2-0-2' },
  { id: 'reverse-lunge', name: 'Reverse Lunges', movementPattern: 'hinge', type: 'strength', focus: 'lower-body', difficulty: 'easy', tempo: '2-0-2' },
  { id: 'walking-lunge', name: 'Walking Lunges', movementPattern: 'hinge', type: 'strength', focus: 'lower-body', difficulty: 'normal', tempo: '2-0-2' },
  { id: 'bulgarian-lunge', name: 'Bulgarian Lunges', movementPattern: 'hinge', type: 'strength', focus: 'lower-body', difficulty: 'hard', tempo: '2-0-2' },

  // ── Core: Anti-extension ─────────────────────────────────────
  { id: 'dead-bug', name: 'Dead Bugs', movementPattern: 'core_anti_ext', type: 'strength', focus: 'abs', difficulty: 'light', tempo: '2-0-2' },
  { id: 'plank', name: 'Plank', movementPattern: 'core_anti_ext', type: 'strength', focus: 'abs', difficulty: 'easy', tempo: 'hold' },
  { id: 'plank-leg-lift', name: 'Plank with Leg Lifts', movementPattern: 'core_anti_ext', type: 'strength', focus: 'abs', difficulty: 'normal', tempo: '2-0-2' },
  { id: 'hollow-hold', name: 'Hollow Body Holds', movementPattern: 'core_anti_ext', type: 'strength', focus: 'abs', difficulty: 'hard', tempo: 'hold' },
  { id: 'ab-rollout', name: 'Ab Rollout (from knees)', movementPattern: 'core_anti_ext', type: 'strength', focus: 'abs', difficulty: 'hard', tempo: '3-0-3' },

  // ── Core: Anti-rotation ──────────────────────────────────────
  { id: 'bird-dog', name: 'Bird Dogs', movementPattern: 'core_anti_rot', type: 'strength', focus: 'abs', difficulty: 'light', tempo: '2-1-2' },
  { id: 'side-plank', name: 'Side Planks', movementPattern: 'core_anti_rot', type: 'strength', focus: 'abs', difficulty: 'easy', tempo: 'hold' },
  { id: 'side-plank-leg', name: 'Side Planks with Leg Lift', movementPattern: 'core_anti_rot', type: 'strength', focus: 'abs', difficulty: 'normal', tempo: '2-0-2' },
  { id: 'side-plank-reach', name: 'Side Plank Reach-Throughs', movementPattern: 'core_anti_rot', type: 'strength', focus: 'abs', difficulty: 'hard', tempo: '2-0-2' },

  // ── Core: Flexion ────────────────────────────────────────────
  { id: 'reverse-crunch', name: 'Reverse Crunches', movementPattern: 'core_flexion', type: 'strength', focus: 'abs', difficulty: 'easy', tempo: '2-0-2' },
  { id: 'leg-raise', name: 'Lying Leg Raises', movementPattern: 'core_flexion', type: 'strength', focus: 'abs', difficulty: 'normal', tempo: '2-0-2' },
  { id: 'vsit-hold', name: 'V-Sit Holds', movementPattern: 'core_flexion', type: 'strength', focus: 'abs', difficulty: 'hard', tempo: 'hold' },
  { id: 'bicycle-crunch', name: 'Bicycle Crunches', movementPattern: 'core_flexion', type: 'strength', focus: 'abs', difficulty: 'normal', tempo: '2-0-2' },

  // ── HIIT ─────────────────────────────────────────────────────
  { id: 'high-knees', name: 'High Knees', movementPattern: 'hiit', type: 'hiit', focus: 'full-body', difficulty: 'light' },
  { id: 'standing-mtn-climber', name: 'Standing Mountain Climbers', movementPattern: 'hiit', type: 'hiit', focus: 'full-body', difficulty: 'easy' },
  { id: 'mtn-climber', name: 'Mountain Climbers', movementPattern: 'hiit', type: 'hiit', focus: 'full-body', difficulty: 'normal' },
  { id: 'squat-thrust', name: 'Squat Thrusts', movementPattern: 'hiit', type: 'hiit', focus: 'full-body', difficulty: 'normal' },
  { id: 'burpee', name: 'Burpees', movementPattern: 'hiit', type: 'hiit', focus: 'full-body', difficulty: 'hard' },
  { id: 'burpee-jump', name: 'Burpees with Jump', movementPattern: 'hiit', type: 'hiit', focus: 'full-body', difficulty: 'advanced' },
  { id: 'lateral-shuffle', name: 'Lateral Shuffles', movementPattern: 'hiit', type: 'hiit', focus: 'full-body', difficulty: 'easy' },
  { id: 'skater-hop', name: 'Skater Hops', movementPattern: 'hiit', type: 'hiit', focus: 'lower-body', difficulty: 'normal' },
  { id: 'plank-jack', name: 'Plank Jacks', movementPattern: 'hiit', type: 'hiit', focus: 'full-body', difficulty: 'normal' },
  { id: 'burpee-mtn-climber', name: 'Burpee to Mountain Climber', movementPattern: 'hiit', type: 'hiit', focus: 'full-body', difficulty: 'advanced' },
]

export function getExercisesByPattern(pattern: MovementPattern): ExerciseDef[] {
  return EXERCISES.filter(e => e.movementPattern === pattern)
}

export function getExercisesByDifficulty(
  pattern: MovementPattern,
  maxDifficulty: Difficulty
): ExerciseDef[] {
  const order: Difficulty[] = ['light', 'easy', 'normal', 'hard', 'advanced']
  const maxIdx = order.indexOf(maxDifficulty)
  return EXERCISES.filter(
    e => e.movementPattern === pattern && order.indexOf(e.difficulty) <= maxIdx
  )
}

export function pickExercise(
  pattern: MovementPattern,
  difficulty: Difficulty,
  exclude?: string[]
): ExerciseDef {
  const order: Difficulty[] = ['light', 'easy', 'normal', 'hard', 'advanced']
  const targetIdx = order.indexOf(difficulty)

  const candidates = EXERCISES.filter(e => {
    if (e.movementPattern !== pattern) return false
    if (exclude?.includes(e.id)) return false
    return order.indexOf(e.difficulty) <= targetIdx
  })

  if (candidates.length === 0) {
    const fallback = EXERCISES.filter(e => {
      if (e.movementPattern !== pattern) return false
      if (exclude?.includes(e.id)) return false
      return true
    })
    return fallback[0] || EXERCISES[0]
  }

  const sameDiff = candidates.filter(e => e.difficulty === difficulty)
  if (sameDiff.length > 0) {
    return sameDiff[Math.floor(Math.random() * sameDiff.length)]
  }
  return candidates[candidates.length - 1]
}
