import AsyncStorage from '@react-native-async-storage/async-storage'
import { STORAGE_KEYS } from '../constants'
import type { Food, FoodNutrients } from '../types'

// User-created custom foods, saved locally and reusable — Bevel's answer for
// the long tail of branded/restaurant items a public database misses. Stored in
// AsyncStorage (cross-platform). Nutrients are the per-serving values the user
// enters; we normalize to the app's per-100g pipeline by using servingSize 100
// with unit 'serving', so computeMealCalories/scaleNutrient yield exact
// per-serving numbers without special-casing the math.

export const CUSTOM_SERVING_SIZE = 100
export const CUSTOM_SERVING_UNIT = 'serving'

function newId(): string {
  return `custom_${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`}`
}

async function readAll(): Promise<Food[]> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.CUSTOM_FOODS)
    return json ? JSON.parse(json) : []
  } catch {
    return []
  }
}

async function writeAll(foods: Food[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.CUSTOM_FOODS, JSON.stringify(foods))
}

export async function getCustomFoods(): Promise<Food[]> {
  const foods = await readAll()
  return foods.sort((a, b) => a.name.localeCompare(b.name))
}

/**
 * Create (or update, when `id` is supplied) a custom food from user-entered
 * per-serving nutrition. Returns the saved Food, ready to add to a meal.
 */
export async function saveCustomFood(input: {
  id?: string
  name: string
  brandName?: string | null
  servingLabel?: string | null
  nutrients: FoodNutrients
}): Promise<Food> {
  const foods = await readAll()
  const food: Food = {
    id: input.id ?? newId(),
    name: input.name.trim(),
    brandName: input.brandName?.trim() || null,
    servingSize: CUSTOM_SERVING_SIZE,
    servingUnit: input.servingLabel?.trim() || CUSTOM_SERVING_UNIT,
    nutrients: input.nutrients,
    custom: true,
  }
  const idx = foods.findIndex((f) => f.id === food.id)
  if (idx >= 0) foods[idx] = food
  else foods.push(food)
  await writeAll(foods)
  return food
}

export async function deleteCustomFood(id: string): Promise<void> {
  const foods = await readAll()
  await writeAll(foods.filter((f) => f.id !== id))
}

export async function searchCustomFoods(query: string): Promise<Food[]> {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const foods = await getCustomFoods()
  return foods.filter((f) => f.name.toLowerCase().includes(q) || (f.brandName || '').toLowerCase().includes(q))
}
