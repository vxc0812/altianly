import { Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { getDb } from './database'
import { getSyncUrl } from './cloudSync'
import type { Food, Meal, MealEntry, MealType, RDITarget, ParsedFoodItem } from '../types'

const isWeb = Platform.OS === 'web'
const WEB_MEALS_KEY = 'altianly_meals'

export async function searchFoods(query: string, pageSize = 25): Promise<Food[]> {
  // USDA lookups go through the worker so the API key stays server-side (env.USDA_API_KEY)
  const base = await getSyncUrl()
  const res = await fetch(`${base}/food/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, pageSize }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `Server error (${res.status})` }))
    throw new Error(err.error || `Food search error ${res.status}`)
  }
  const data = await res.json()
  return (data.foods || []) as Food[]
}

export async function searchFoodByBarcode(barcode: string): Promise<Food | null> {
  try {
    const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${barcode}.json`)
    if (!res.ok) return null
    const data = await res.json()
    if (data.status_verbose !== 'product found') return null
    const p = data.product
    const n = p.nutriments || {}
    return {
      id: barcode,
      name: p.product_name || `Product ${barcode}`,
      brandName: p.brands || null,
      servingSize: null,
      servingUnit: 'g',
      nutrients: {
        calories: Math.round((n['energy-kcal_100g'] || 0) * 10) / 10,
        protein: Math.round((n.proteins_100g || 0) * 10) / 10,
        carbs: Math.round((n.carbohydrates_100g || 0) * 10) / 10,
        fat: Math.round((n.fat_100g || 0) * 10) / 10,
        fiber: Math.round((n.fiber_100g || 0) * 10) / 10,
        sugar: Math.round((n.sugars_100g || 0) * 10) / 10,
        sodium: Math.round((n.sodium_100g || 0) * 10) / 10,
      },
    }
  } catch {
    return null
  }
}

export async function parseFoodText(text: string): Promise<ParsedFoodItem[]> {
  const base = await getSyncUrl()
  const res = await fetch(`${base}/food/parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Parse failed' }))
    throw new Error(err.error || `Server error (${res.status})`)
  }
  const data = await res.json()
  return data.items || []
}

export function computeMealCalories(entry: {
  servings: number
  servingSize: number
  calories: number
}): number {
  if (entry.servingSize > 0) {
    return Math.round((entry.calories / 100) * entry.servingSize * entry.servings)
  }
  return Math.round(entry.calories * entry.servings)
}

export function scaleNutrient(value: number, servingSize: number, servings: number): number {
  if (servingSize > 0) return Math.round(((value / 100) * servingSize * servings) * 10) / 10
  return Math.round(value * servings * 10) / 10
}

export function createMealEntry(
  mealId: string,
  food: Food,
  servings: number,
  servingSize: number,
  servingUnit: string,
): Omit<MealEntry, 'createdAt'> {
  const id = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const n = food.nutrients
  return {
    id,
    mealId,
    foodId: food.id,
    foodName: food.name,
    foodBrand: food.brandName || null,
    servingSize,
    servingUnit,
    servings,
    calories: computeMealCalories({ servings, servingSize, calories: n.calories }),
    protein: scaleNutrient(n.protein, servingSize, servings),
    carbs: scaleNutrient(n.carbs, servingSize, servings),
    fat: scaleNutrient(n.fat, servingSize, servings),
    fiber: scaleNutrient(n.fiber || 0, servingSize, servings),
    sugar: scaleNutrient(n.sugar || 0, servingSize, servings),
    sodium: scaleNutrient(n.sodium || 0, servingSize, servings),
  }
}

export async function createMeal(
  date: string,
  type: MealType,
  entries: { food: Food; servings: number; servingSize: number; servingUnit: string }[],
): Promise<Meal> {
  const mealId = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const now = Date.now()
  const mealEntries: MealEntry[] = []

  if (isWeb) {
    for (const e of entries) {
      mealEntries.push({ ...createMealEntry(mealId, e.food, e.servings, e.servingSize, e.servingUnit), createdAt: now })
    }
    const meal: Meal = { id: mealId, date, type, entries: mealEntries, createdAt: now }
    const json = await AsyncStorage.getItem(WEB_MEALS_KEY)
    const all: Record<string, Meal[]> = json ? JSON.parse(json) : {}
    all[date] = [...(all[date] || []), meal]
    await AsyncStorage.setItem(WEB_MEALS_KEY, JSON.stringify(all))
    return meal
  }

  const db = await getDb()
  await db.runAsync('INSERT INTO meals (id, date, type, created_at) VALUES (?, ?, ?, ?)', [mealId, date, type, now])
  for (const e of entries) {
    const entry = createMealEntry(mealId, e.food, e.servings, e.servingSize, e.servingUnit)
    await db.runAsync(
      `INSERT INTO meal_entries (id, meal_id, food_id, food_name, food_brand, serving_size, serving_unit, servings,
        calories, protein, carbs, fat, fiber, sugar, sodium, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [entry.id, mealId, entry.foodId, entry.foodName, entry.foodBrand ?? null,
       entry.servingSize, entry.servingUnit, entry.servings,
       entry.calories, entry.protein, entry.carbs, entry.fat,
       entry.fiber, entry.sugar, entry.sodium, now],
    )
    mealEntries.push({ ...entry, createdAt: now })
  }
  return { id: mealId, date, type, entries: mealEntries, createdAt: now }
}

export async function getMealsForDate(date: string): Promise<Meal[]> {
  if (isWeb) {
    const json = await AsyncStorage.getItem(WEB_MEALS_KEY)
    const all: Record<string, Meal[]> = json ? JSON.parse(json) : {}
    return all[date] || []
  }

  const db = await getDb()
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT id, date, type, created_at FROM meals WHERE date = ? ORDER BY created_at ASC',
    [date],
  )

  const meals: Meal[] = []
  for (const row of rows) {
    const entries = await db.getAllAsync<Record<string, unknown>>(
      `SELECT id, meal_id, food_id, food_name, food_brand, serving_size, serving_unit, servings,
        calories, protein, carbs, fat, fiber, sugar, sodium, created_at
       FROM meal_entries WHERE meal_id = ? ORDER BY created_at ASC`,
      [row.id as string],
    )
    meals.push({
      id: row.id as string,
      date: row.date as string,
      type: row.type as MealType,
      entries: entries.map(mapEntry),
      createdAt: row.created_at as number,
    })
  }
  return meals
}

function mapEntry(row: Record<string, unknown>): MealEntry {
  return {
    id: row.id as string,
    mealId: row.meal_id as string,
    foodId: row.food_id as string,
    foodName: row.food_name as string,
    foodBrand: row.food_brand as string | null,
    servingSize: row.serving_size as number,
    servingUnit: row.serving_unit as string,
    servings: row.servings as number,
    calories: row.calories as number,
    protein: row.protein as number,
    carbs: row.carbs as number,
    fat: row.fat as number,
    fiber: row.fiber as number,
    sugar: row.sugar as number,
    sodium: row.sodium as number,
    createdAt: row.created_at as number,
  }
}

export function getDailyTotals(meals: Meal[]): {
  calories: number; protein: number; carbs: number; fat: number; fiber: number; sugar: number; sodium: number
} {
  let calories = 0, protein = 0, carbs = 0, fat = 0, fiber = 0, sugar = 0, sodium = 0
  for (const meal of meals) {
    for (const e of meal.entries) {
      calories += e.calories
      protein += e.protein
      carbs += e.carbs
      fat += e.fat
      fiber += e.fiber
      sugar += e.sugar
      sodium += e.sodium
    }
  }
  return {
    calories: Math.round(calories),
    protein: Math.round(protein * 10) / 10,
    carbs: Math.round(carbs * 10) / 10,
    fat: Math.round(fat * 10) / 10,
    fiber: Math.round(fiber * 10) / 10,
    sugar: Math.round(sugar * 10) / 10,
    sodium: Math.round(sodium * 10) / 10,
  }
}

export const DEFAULT_RDI: RDITarget = {
  calories: 2000,
  protein: 50,
  carbs: 275,
  fat: 65,
  fiber: 25,
}

export async function deleteMeal(mealId: string): Promise<void> {
  if (isWeb) {
    const json = await AsyncStorage.getItem(WEB_MEALS_KEY)
    if (!json) return
    const all: Record<string, Meal[]> = JSON.parse(json)
    for (const date of Object.keys(all)) {
      all[date] = all[date].filter((m) => m.id !== mealId)
      if (all[date].length === 0) delete all[date]
    }
    await AsyncStorage.setItem(WEB_MEALS_KEY, JSON.stringify(all))
    return
  }

  const db = await getDb()
  await db.runAsync('DELETE FROM meal_entries WHERE meal_id = ?', [mealId])
  await db.runAsync('DELETE FROM meals WHERE id = ?', [mealId])
}
