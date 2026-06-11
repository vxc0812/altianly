import { BMIResult, BMIEvaluation } from '../types'
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
