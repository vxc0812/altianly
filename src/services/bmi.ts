import { BMIResult, BMIEvaluation, Gender, BodyMeasurements, WaistHeightResult, BodyFatResult } from '../types'
import { BMI_RANGES } from '../constants'

function getEvaluation(bmi: number): BMIEvaluation {
  if (bmi < BMI_RANGES.underweight.max) return 'underweight'
  if (bmi < BMI_RANGES.normal.max) return 'normal'
  if (bmi < BMI_RANGES.overweight.max) return 'overweight'
  return 'obese'
}

export function calculateBMI(weightLbs: number, heightFeet: number, heightInches: number): BMIResult {
  const totalHeightInches = (heightFeet * 12) + heightInches
  const bmi = (weightLbs / (totalHeightInches * totalHeightInches)) * 703
  const rounded = Math.round(bmi * 10) / 10
  return { bmi: rounded, evaluation: getEvaluation(rounded) }
}

export function totalHeightInches(heightFeet: number, heightInches: number): number {
  return (heightFeet * 12) + heightInches
}

/**
 * Waist-to-height ratio — a better screening signal than BMI for central
 * adiposity, and one BMI can't provide. Both measurements must share a unit
 * (we pass inches). Thresholds follow the widely-cited "keep your waist under
 * half your height" guidance (Ashwell et al.).
 */
export function waistToHeight(waistInches: number, heightInches: number): WaistHeightResult | null {
  if (!waistInches || !heightInches || waistInches <= 0 || heightInches <= 0) return null
  const ratio = Math.round((waistInches / heightInches) * 100) / 100
  let category: WaistHeightResult['category']
  let label: string
  if (ratio < 0.4) {
    category = 'low'
    label = 'Below typical range'
  } else if (ratio < 0.5) {
    category = 'healthy'
    label = 'Healthy range'
  } else if (ratio < 0.6) {
    category = 'increased'
    label = 'Increased range'
  } else {
    category = 'high'
    label = 'High range'
  }
  return { ratio, category, label }
}

function bodyFatCategory(percent: number, gender: Gender): BodyFatResult['category'] {
  // ACE-style bands; women carry more essential fat, so thresholds shift up.
  const female = gender === 'female'
  if (percent < (female ? 14 : 6)) return 'essential'
  if (percent < (female ? 21 : 14)) return 'athlete'
  if (percent < (female ? 25 : 18)) return 'fitness'
  if (percent < (female ? 32 : 25)) return 'average'
  return 'high'
}

const bodyFatLabels: Record<BodyFatResult['category'], string> = {
  essential: 'Essential fat',
  athlete: 'Athletic',
  fitness: 'Fitness',
  average: 'Average',
  high: 'Above average',
}

/**
 * US Navy body-fat estimate (imperial / inches). It only needs a tape measure,
 * so it's a low-friction way to add body composition — something BMI can't
 * distinguish. Men need waist + neck; women additionally need hip. Returns null
 * when the required measurements aren't present.
 */
export function estimateBodyFatNavy(
  gender: Gender,
  measurements: BodyMeasurements,
  heightInches: number,
): BodyFatResult | null {
  const { waistInches, neckInches, hipInches } = measurements
  if (!waistInches || !neckInches || !heightInches) return null
  // 'other' falls back to the female formula when a hip measurement is given
  // (it needs three points), otherwise the male formula.
  const useFemale = gender === 'female' || (gender === 'other' && !!hipInches)

  let percent: number
  if (useFemale) {
    if (!hipInches) return null
    const inner = waistInches + hipInches - neckInches
    if (inner <= 0) return null
    percent = 163.205 * Math.log10(inner) - 97.684 * Math.log10(heightInches) - 78.387
  } else {
    const inner = waistInches - neckInches
    if (inner <= 0) return null
    percent = 86.010 * Math.log10(inner) - 70.041 * Math.log10(heightInches) + 36.76
  }

  if (!isFinite(percent) || percent <= 0 || percent >= 75) return null
  const rounded = Math.round(percent * 10) / 10
  const category = bodyFatCategory(rounded, gender)
  return { percent: rounded, category, label: bodyFatLabels[category] }
}
