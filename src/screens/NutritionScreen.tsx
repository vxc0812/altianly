import React, { useCallback, useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Modal, Alert, ActivityIndicator, Platform,
} from 'react-native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useFocusEffect } from '@react-navigation/native'
import type { RootStackParamList, Food, Meal, MealEntry, MealType } from '../types'
import { useTheme } from '../context/ThemeContext'
import { Theme } from '../constants/theme'
import { searchFoods, createMeal, getMealsForDate, getDailyTotals, deleteMeal, DEFAULT_RDI, parseFoodText, searchFoodByBarcode, computeMealCalories, scaleNutrient } from '../services/nutrition'
import type { ParsedFoodItem } from '../types'
import BarcodeScanner from '../components/BarcodeScanner'

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Nutrition'> }

const EMPTY_FOODS: Food[] = []

function renderFoodResults(
  foods: Food[],
  selected: Food | null,
  onSelect: (f: Food) => void,
  sty: ReturnType<typeof styles>,
): React.ReactNode {
  return foods.map((f) => {
    const sel = selected?.id === f.id
    return (
      <TouchableOpacity
        key={f.id}
        style={[sty.foodRow, sel && sty.foodRowSelected]}
        onPress={() => onSelect(f)}
      >
        <View style={{ flex: 1 }}>
          <Text style={sty.foodName}>{f.name}</Text>
          {f.brandName && <Text style={sty.foodBrand}>{f.brandName}</Text>}
          <Text style={sty.foodNutrients}>
            {Math.round(f.nutrients.calories)} kcal · P {f.nutrients.protein}g · C {f.nutrients.carbs}g · F {f.nutrients.fat}g
            {f.servingSize ? ` / ${f.servingSize}${f.servingUnit || 'g'}` : ' / 100g'}
          </Text>
        </View>
        {sel && <Text style={sty.foodCheck}>✓</Text>}
      </TouchableOpacity>
    )
  })
}

const MEAL_TYPES: { key: MealType; label: string; icon: string }[] = [
  { key: 'breakfast', label: 'Breakfast', icon: '🌅' },
  { key: 'lunch', label: 'Lunch', icon: '☀️' },
  { key: 'dinner', label: 'Dinner', icon: '🌙' },
  { key: 'snack', label: 'Snacks', icon: '🍿' },
]

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function displayDate(date: Date): string {
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  if (date.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
  return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}



export default function NutritionScreen(_props: Props) {
  const { theme } = useTheme()
  const s = styles(theme)

  const [currentDate, setCurrentDate] = useState(new Date())
  const [meals, setMeals] = useState<Meal[]>([])
  const [addingToMeal, setAddingToMeal] = useState<MealType | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [foodResults, setFoodResults] = useState<Food[]>(EMPTY_FOODS)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [selectedFood, setSelectedFood] = useState<Food | null>(null)
  const [servings, setServings] = useState('1')
  const [saving, setSaving] = useState(false)
  const [nlpText, setNlpText] = useState('')
  const [parsedItems, setParsedItems] = useState<ParsedFoodItem[]>([])
  const [parsing, setParsing] = useState(false)
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set())
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false)

  const totals = getDailyTotals(meals)
  const rdi = DEFAULT_RDI
  const calPct = Math.min(totals.calories / rdi.calories, 1)

  useFocusEffect(useCallback(() => {
    loadMealsForDate(formatDate(currentDate))
  }, [currentDate]))

  async function loadMealsForDate(date: string) {
    const m = await getMealsForDate(date)
    setMeals(m)
  }

  function changeDate(delta: number) {
    const d = new Date(currentDate)
    d.setDate(d.getDate() + delta)
    setCurrentDate(d)
  }

  async function handleSearch() {
    if (!searchQuery.trim()) return
    setSearching(true)
    setSearchError('')
    try {
      const results = await searchFoods(searchQuery.trim())
      setFoodResults(results)
    } catch (e) {
      setFoodResults([] as Food[])
      setSearchError((e as Error).message || 'Search failed. Try a different query.')
    } finally {
      setSearching(false)
    }
  }

  async function handleParse() {
    if (!nlpText.trim()) return
    setParsing(true)
    try {
      const items = await parseFoodText(nlpText.trim())
      setParsedItems(items)
      setCheckedItems(new Set(items.map((_, i) => i)))
    } catch (e) {
      Alert.alert('Parse error', (e as Error).message || 'Could not parse food text')
    } finally {
      setParsing(false)
    }
  }

  function toggleItem(idx: number) {
    const next = new Set(checkedItems)
    if (next.has(idx)) { next.delete(idx) } else { next.add(idx) }
    setCheckedItems(next)
  }

  async function handleAddParsed() {
    if (!addingToMeal || checkedItems.size === 0) return
    setSaving(true)
    try {
      const existing = getMealForType(addingToMeal)
      const mealDate = formatDate(currentDate)
      const entries: { food: Food; servings: number; servingSize: number; servingUnit: string }[] = []
      for (const idx of checkedItems) {
        const item = parsedItems[idx]
        const f = item.food || {
          id: `est_${item.name}`,
          name: item.name,
          brandName: null,
          servingSize: 100,
          servingUnit: 'g',
          nutrients: item.estimatedNutrients || { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 },
        }
        entries.push({ food: f, servings: item.servings, servingSize: f.servingSize ?? 100, servingUnit: f.servingUnit || 'g' })
      }
      if (existing) {
        await deleteMeal(existing.id)
        await createMeal(mealDate, addingToMeal, [...existing.entries.map(mapMealEntryToInput), ...entries])
      } else {
        await createMeal(mealDate, addingToMeal, entries)
      }
      setParsedItems([])
      setNlpText('')
      setAddingToMeal(null)
      await loadMealsForDate(mealDate)
    } catch (e) {
      Alert.alert('Error adding food', (e as Error).message || 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  async function handleBarcodeScanned(barcode: string) {
    setShowBarcodeScanner(false)
    if (!addingToMeal || !barcode) return
    setSaving(true)
    try {
      const food = await searchFoodByBarcode(barcode)
      if (!food) {
        Alert.alert('Not found', `No product found for barcode ${barcode}. Try searching manually.`)
        return
      }
      const existing = getMealForType(addingToMeal)
      const mealDate = formatDate(currentDate)
      if (existing) {
        await deleteMeal(existing.id)
        await createMeal(mealDate, addingToMeal, [
          ...existing.entries.map(mapMealEntryToInput),
          { food, servings: 1, servingSize: 100, servingUnit: 'g' },
        ])
      } else {
        await createMeal(mealDate, addingToMeal, [{ food, servings: 1, servingSize: 100, servingUnit: 'g' }])
      }
      setAddingToMeal(null)
      await loadMealsForDate(mealDate)
    } catch (e) {
      Alert.alert('Error', (e as Error).message || 'Failed to add scanned food')
    } finally {
      setSaving(false)
    }
  }

  function getMealForType(type: MealType): Meal | undefined {
    return meals.find((m) => m.type === type)
  }

  async function handleAddFood() {
    if (!selectedFood || !addingToMeal) return
    setSaving(true)
    try {
      const existing = getMealForType(addingToMeal)
      const foodServings = parseFloat(servings) || 1
      const servingSize = selectedFood.servingSize ?? 100
      const servingUnit = selectedFood.servingUnit || 'g'

      const mealDate = formatDate(currentDate)
      if (existing) {
        const entry = {
          food: selectedFood,
          servings: foodServings,
          servingSize,
          servingUnit,
        }
        await deleteMeal(existing.id)
        await createMeal(mealDate, addingToMeal, [...existing.entries.map(mapMealEntryToInput), entry])
      } else {
        await createMeal(mealDate, addingToMeal, [{
          food: selectedFood,
          servings: foodServings,
          servingSize,
          servingUnit,
        }])
      }
      setSelectedFood(null)
      setFoodResults([] as Food[])
      setSearchQuery('')
      setServings('1')
      setAddingToMeal(null)
      const ds = formatDate(currentDate)
      await loadMealsForDate(ds)
    } catch (e) {
      Alert.alert('Error adding food', (e as Error).message || 'Unknown error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteEntry(mealId: string, _entryId: string) {
    const meal = meals.find((m) => m.id === mealId)
    if (!meal) return
    const updated = meal.entries.filter((e) => e.id !== _entryId)
    if (updated.length === 0) {
      await deleteMeal(mealId)
    } else {
      await deleteMeal(mealId)
      await createMeal(formatDate(currentDate), meal.type, updated.map(mapMealEntryToInput))
    }
    const ds = formatDate(currentDate)
    await loadMealsForDate(ds)
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <View style={{ width: 50 }} />
        <Text style={s.heading}>Nutrition</Text>
        <View style={{ width: 50 }} />
      </View>

      {/* Date nav */}
      <View style={s.dateRow}>
        <TouchableOpacity onPress={() => changeDate(-1)} style={s.dateArrow}>
          <Text style={s.dateArrowText}>{'<'}</Text>
        </TouchableOpacity>
        <Text style={s.dateLabel}>{displayDate(currentDate)}</Text>
        <TouchableOpacity onPress={() => changeDate(1)} style={s.dateArrow}>
          <Text style={s.dateArrowText}>{'>'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={s.content}>
        {/* Calorie ring */}
        <View style={s.calorieCard}>
          <View style={s.calorieRing}>
            <Text style={s.calorieValue}>{totals.calories}</Text>
            <Text style={s.calorieLabel}>kcal</Text>
          </View>
          <View style={s.calorieBarBg}>
            <View style={[s.calorieBarFill, { width: `${calPct * 100}%` }]} />
          </View>
          <Text style={s.calorieRemain}>{Math.max(0, rdi.calories - totals.calories)} kcal remaining</Text>
        </View>

        {/* Macros */}
        <View style={s.macroRow}>
          {[
            { label: 'Protein', value: `${totals.protein}g`, target: `${rdi.protein}g`, pct: Math.min(totals.protein / rdi.protein, 1), color: theme.accent },
            { label: 'Carbs', value: `${totals.carbs}g`, target: `${rdi.carbs}g`, pct: Math.min(totals.carbs / rdi.carbs, 1), color: theme.isDark ? '#34D399' : '#10B981' },
            { label: 'Fat', value: `${totals.fat}g`, target: `${rdi.fat}g`, pct: Math.min(totals.fat / rdi.fat, 1), color: theme.isDark ? '#FBBF24' : '#F59E0B' },
          ].map((macro) => (
            <View key={macro.label} style={s.macroCard}>
              <View style={[s.macroBarBg]}>
                <View style={[s.macroBarFill, { width: `${macro.pct * 100}%`, backgroundColor: macro.color }]} />
              </View>
              <Text style={s.macroValue}>{macro.value}</Text>
              <Text style={s.macroLabel}>{macro.label}</Text>
              <Text style={s.macroTarget}>target {macro.target}</Text>
            </View>
          ))}
        </View>

        {/* Meals */}
        {MEAL_TYPES.map((mt) => {
          const meal = getMealForType(mt.key)
          return (
            <View key={mt.key} style={s.mealSection}>
              <View style={s.mealHeader}>
                <Text style={s.mealIcon}>{mt.icon}</Text>
                <Text style={s.mealLabel}>{mt.label}</Text>
                {meal && (
                  <Text style={s.mealCalories}>{meal.entries.reduce((sum, e) => sum + e.calories, 0)} kcal</Text>
                )}
              </View>
              {meal?.entries.map((entry) => (
                <View key={entry.id} style={s.entryRow}>
                  <View style={s.entryInfo}>
                    <Text style={s.entryName}>{entry.foodName}</Text>
                    <Text style={s.entryDetail}>
                      {entry.servings} × {entry.servingSize}{entry.servingUnit}
                      {' · '}{entry.calories} kcal · P {entry.protein}g · C {entry.carbs}g · F {entry.fat}g
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteEntry(meal.id, entry.id)} style={s.entryDelete}>
                    <Text style={s.entryDeleteText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity
                style={s.addFoodButton}
                onPress={() => setAddingToMeal(mt.key)}
              >
                <Text style={s.addFoodText}>+ Add Food</Text>
              </TouchableOpacity>
            </View>
          )
        })}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Food search modal */}
      <Modal visible={!!addingToMeal} animationType="slide" transparent onRequestClose={() => { setAddingToMeal(null); setParsedItems([]); setNlpText('') }}>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Add to {MEAL_TYPES.find((mt) => mt.key === addingToMeal)?.label}</Text>
              <TouchableOpacity onPress={() => { setAddingToMeal(null); setSelectedFood(null); setFoodResults([] as Food[]); setSearchQuery(''); setParsedItems([]); setNlpText('') }}>
                <Text style={s.modalClose}>Done</Text>
              </TouchableOpacity>
            </View>

            {!selectedFood ? (
              <View style={s.modalBody}>
                {/* Natural language input */}
                <Text style={s.sectionLabel}>Quick add</Text>
                <View style={s.nlpRow}>
                  <TextInput
                    style={s.searchInput}
                    value={nlpText}
                    onChangeText={(t) => { setNlpText(t); setParsedItems([]) }}
                    placeholder='e.g. "Chicken sandwich + latte"'
                    placeholderTextColor={theme.textMuted}
                    returnKeyType="go"
                    onSubmitEditing={handleParse}
                  />
                  <TouchableOpacity style={s.searchButton} onPress={handleParse} disabled={parsing}>
                    {parsing ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={s.searchButtonText}>Parse</Text>}
                  </TouchableOpacity>
                </View>

                {/* Parsed results */}
                {parsedItems.length > 0 && (
                  <View style={s.parsedSection}>
                    {parsedItems.map((item, idx) => {
                      const checked = checkedItems.has(idx)
                      const tierLabel = item.tier === 1 ? 'Verified' : item.tier === 2 ? 'Estimated' : 'AI guess'
                      const tierColor = item.tier === 1 ? theme.success : item.tier === 2 ? '#FBBF24' : theme.textMuted
                      // Use the exact math the save path applies (computeMealCalories/
                      // scaleNutrient with the food's servingSize) so the preview total
                      // matches what actually gets logged — they used to drift whenever a
                      // USDA food's serving size wasn't 100g.
                      const baseNutrients = item.food?.nutrients ?? item.estimatedNutrients ?? { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 }
                      const previewServingSize = item.food?.servingSize ?? 100
                      const kcal = computeMealCalories({ servings: item.servings, servingSize: previewServingSize, calories: baseNutrients.calories })
                      const protein = scaleNutrient(baseNutrients.protein, previewServingSize, item.servings)
                      const carbs = scaleNutrient(baseNutrients.carbs, previewServingSize, item.servings)
                      const fat = scaleNutrient(baseNutrients.fat, previewServingSize, item.servings)
                      return (
                        <TouchableOpacity key={idx} style={s.parsedRow} onPress={() => toggleItem(idx)}>
                          <View style={[s.checkbox, checked && s.checkboxChecked]}>
                            {checked && <Text style={s.checkmark}>✓</Text>}
                          </View>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={s.parsedName}>{item.name}</Text>
                              <View style={[s.tierBadge, { backgroundColor: tierColor + '20', borderColor: tierColor }]}>
                                <Text style={[s.tierText, { color: tierColor }]}>{tierLabel}</Text>
                              </View>
                            </View>
                            <Text style={s.parsedDetail}>
                              {item.servings} serving{item.servings !== 1 ? 's' : ''}
                              {' · '}{Math.round(kcal)} kcal · P {protein.toFixed(1)}g · C {carbs.toFixed(1)}g · F {fat.toFixed(1)}g
                            </Text>
                          </View>
                        </TouchableOpacity>
                      )
                    })}
                    <TouchableOpacity
                      style={[s.confirmButton, checkedItems.size === 0 && { opacity: 0.4 }]}
                      onPress={handleAddParsed}
                      disabled={saving || checkedItems.size === 0}
                    >
                      {saving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={s.confirmButtonText}>Add {checkedItems.size} item{checkedItems.size !== 1 ? 's' : ''}</Text>}
                    </TouchableOpacity>
                    <View style={s.divider} />
                  </View>
                )}

                {/* Search input */}
                <Text style={s.sectionLabel}>Search USDA database</Text>
                <View style={s.searchRow}>
                  <TextInput
                    style={s.searchInput}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Search foods..."
                    placeholderTextColor={theme.textMuted}
                    returnKeyType="search"
                    onSubmitEditing={handleSearch}
                  />
                  <TouchableOpacity style={s.searchButton} onPress={handleSearch} disabled={searching}>
                    {searching ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={s.searchButtonText}>Search</Text>}
                  </TouchableOpacity>
                  <TouchableOpacity style={s.scanButton} onPress={() => setShowBarcodeScanner(true)}>
                    <Text style={s.scanButtonText}>📷</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={s.foodResults}>
                  {renderFoodResults(foodResults, selectedFood, setSelectedFood, s)}
                  {searchError ? (
                    <Text style={s.searchErrorText}>{searchError}</Text>
                  ) : searchQuery && !searching && foodResults.length === 0 ? (
                    <Text style={s.noResults}>No foods found. Try a different search.</Text>
                  ) : null}
                </ScrollView>
              </View>
            ) : (
              <View style={s.modalBody}>
                <View style={s.selectedFoodCard}>
                  <Text style={s.selectedFoodName}>{selectedFood.name}</Text>
                  {selectedFood.brandName && <Text style={s.selectedFoodBrand}>{selectedFood.brandName}</Text>}
                  <Text style={s.selectedFoodServing}>
                    Serving: {selectedFood.servingSize || 100}{selectedFood.servingUnit || 'g'} — {Math.round(selectedFood.nutrients.calories)} kcal
                  </Text>
                </View>

                <Text style={s.servingsLabel}>Number of servings</Text>
                <View style={s.servingsRow}>
                  <TouchableOpacity style={s.servingBtn} onPress={() => setServings(String(Math.max(0.25, parseFloat(servings || '1') - 0.25)))}>
                    <Text style={s.servingBtnText}>-</Text>
                  </TouchableOpacity>
                  <TextInput
                    style={s.servingsInput}
                    value={servings}
                    onChangeText={setServings}
                    keyboardType="decimal-pad"
                  />
                  <TouchableOpacity style={s.servingBtn} onPress={() => setServings(String(parseFloat(servings || '1') + 0.25))}>
                    <Text style={s.servingBtnText}>+</Text>
                  </TouchableOpacity>
                </View>

                <View style={s.servingPreview}>
                  <Text style={s.previewLabel}>Totals:</Text>
                  <Text style={s.previewText}>
                    {Math.round((selectedFood.nutrients.calories / 100) * (selectedFood.servingSize || 100) * (parseFloat(servings) || 1))} kcal · P {((selectedFood.nutrients.protein / 100) * (selectedFood.servingSize || 100) * (parseFloat(servings) || 1)).toFixed(1)}g · C {((selectedFood.nutrients.carbs / 100) * (selectedFood.servingSize || 100) * (parseFloat(servings) || 1)).toFixed(1)}g · F {((selectedFood.nutrients.fat / 100) * (selectedFood.servingSize || 100) * (parseFloat(servings) || 1)).toFixed(1)}g
                  </Text>
                </View>

                <TouchableOpacity style={s.confirmButton} onPress={handleAddFood} disabled={saving}>
                  {saving ? <ActivityIndicator color="#FFF" size="small" /> : <Text style={s.confirmButtonText}>Add to Meal</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={s.backButton} onPress={() => setSelectedFood(null)}>
                  <Text style={s.backButtonText}>Change food</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <BarcodeScanner
        visible={showBarcodeScanner}
        onScanned={handleBarcodeScanned}
        onClose={() => setShowBarcodeScanner(false)}
      />
    </View>
  )
}

function mapMealEntryToInput(e: MealEntry): { food: Food; servings: number; servingSize: number; servingUnit: string } {
  return {
    food: {
      id: e.foodId,
      name: e.foodName,
      brandName: e.foodBrand,
      servingSize: e.servingSize,
      servingUnit: e.servingUnit,
      nutrients: {
        calories: e.calories,
        protein: e.protein,
        carbs: e.carbs,
        fat: e.fat,
        fiber: e.fiber,
        sugar: e.sugar,
        sodium: e.sodium,
      },
    },
    servings: e.servings,
    servingSize: e.servingSize,
    servingUnit: e.servingUnit,
  }
}

const styles = (t: Theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 24, paddingTop: 60,
  },
  backText: { color: t.accent, fontSize: 16 },
  heading: { color: t.text, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  content: { padding: 24, paddingTop: 0, paddingBottom: 40 },

  // Date nav
  dateRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    marginBottom: 20, gap: 16,
  },
  dateArrow: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: t.surface, borderWidth: 1, borderColor: t.border,
    alignItems: 'center', justifyContent: 'center',
  },
  dateArrowText: { color: t.text, fontSize: 16, fontWeight: '600' },
  dateLabel: { color: t.text, fontSize: 16, fontWeight: '700', minWidth: 100, textAlign: 'center' },

  // Calorie card
  calorieCard: {
    backgroundColor: t.surface, borderWidth: 1, borderColor: t.border, borderRadius: 12,
    padding: 24, alignItems: 'center', marginBottom: 16,
  },
  calorieRing: {
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 4, borderColor: t.accent, alignItems: 'center', justifyContent: 'center',
    marginBottom: 16,
  },
  calorieValue: { color: t.text, fontSize: 28, fontWeight: '800' },
  calorieLabel: { color: t.textSecondary, fontSize: 12 },
  calorieBarBg: { width: '100%', height: 8, backgroundColor: t.border, borderRadius: 4, overflow: 'hidden' },
  calorieBarFill: { height: '100%', backgroundColor: t.accent, borderRadius: 4 },
  calorieRemain: { color: t.textSecondary, fontSize: 13, marginTop: 8 },

  // Macros
  macroRow: { flexDirection: 'row', gap: 8, marginBottom: 24 },
  macroCard: {
    flex: 1, backgroundColor: t.surface, borderWidth: 1, borderColor: t.border,
    borderRadius: 10, padding: 12, alignItems: 'center',
  },
  macroBarBg: { width: '100%', height: 4, backgroundColor: t.border, borderRadius: 2, overflow: 'hidden', marginBottom: 8 },
  macroBarFill: { height: '100%', borderRadius: 2 },
  macroValue: { color: t.text, fontSize: 15, fontWeight: '700' },
  macroLabel: { color: t.textSecondary, fontSize: 11, marginTop: 2 },
  macroTarget: { color: t.textMuted, fontSize: 10, marginTop: 2 },

  // Meal sections
  mealSection: {
    backgroundColor: t.surface, borderWidth: 1, borderColor: t.border,
    borderRadius: 10, padding: 14, marginBottom: 12,
  },
  mealHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  mealIcon: { fontSize: 18 },
  mealLabel: { color: t.text, fontSize: 15, fontWeight: '700', flex: 1 },
  mealCalories: { color: t.accent, fontSize: 14, fontWeight: '600' },
  entryRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8,
    borderTopWidth: 1, borderTopColor: t.border,
  },
  entryInfo: { flex: 1 },
  entryName: { color: t.text, fontSize: 14, fontWeight: '600' },
  entryDetail: { color: t.textSecondary, fontSize: 11, marginTop: 2 },
  entryDelete: { padding: 8 },
  entryDeleteText: { color: t.danger, fontSize: 14, fontWeight: '700' },
  addFoodButton: {
    borderWidth: 1, borderColor: t.accent, borderRadius: 8,
    padding: 10, alignItems: 'center', marginTop: 8, borderStyle: 'dashed',
  },
  addFoodText: { color: t.accent, fontSize: 13, fontWeight: '600' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: t.bg, borderTopLeftRadius: 16, borderTopRightRadius: 16,
    maxHeight: '85%', paddingBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: t.border,
  },
  modalTitle: { color: t.text, fontSize: 17, fontWeight: '700' },
  modalClose: { color: t.accent, fontSize: 16, fontWeight: '600' },
  modalBody: { padding: 20 },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  searchInput: {
    flex: 1, backgroundColor: t.inputBg, borderWidth: 1, borderColor: t.border,
    borderRadius: 8, padding: 12, color: t.text, fontSize: 15,
  },
  searchButton: {
    backgroundColor: t.accent, borderRadius: 8, paddingHorizontal: 16,
    justifyContent: 'center', minWidth: 70, alignItems: 'center',
  },
  searchButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  scanButton: {
    width: 44, height: 44, borderRadius: 8,
    backgroundColor: t.surface, borderWidth: 1, borderColor: t.border,
    alignItems: 'center', justifyContent: 'center',
  },
  scanButtonText: { fontSize: 20 },
  foodResults: { maxHeight: 350 },
  foodRow: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    borderBottomWidth: 1, borderBottomColor: t.border,
  },
  foodRowSelected: { backgroundColor: t.selectedBg },
  foodName: { color: t.text, fontSize: 14, fontWeight: '600' },
  foodBrand: { color: t.textMuted, fontSize: 11, marginTop: 1 },
  foodNutrients: { color: t.textSecondary, fontSize: 11, marginTop: 3 },
  foodCheck: { color: t.accent, fontSize: 16, fontWeight: '700', marginLeft: 8 },
  noResults: { color: t.textSecondary, fontSize: 14, textAlign: 'center', padding: 24 },
  searchErrorText: { color: t.danger, fontSize: 14, textAlign: 'center', padding: 24 },

  // NLP section
  sectionLabel: { color: t.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  nlpRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  parsedSection: { marginBottom: 8 },
  parsedRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 },
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: t.border, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: t.accent, borderColor: t.accent },
  checkmark: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  parsedName: { color: t.text, fontSize: 14, fontWeight: '600', flex: 1 },
  parsedDetail: { color: t.textSecondary, fontSize: 11, marginTop: 2 },
  tierBadge: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
  tierText: { fontSize: 10, fontWeight: '700' },
  divider: { height: 1, backgroundColor: t.border, marginVertical: 12 },

  // Selected food
  selectedFoodCard: {
    backgroundColor: t.surface, borderWidth: 1, borderColor: t.border,
    borderRadius: 10, padding: 14, marginBottom: 20,
  },
  selectedFoodName: { color: t.text, fontSize: 16, fontWeight: '700' },
  selectedFoodBrand: { color: t.textMuted, fontSize: 12, marginTop: 2 },
  selectedFoodServing: { color: t.textSecondary, fontSize: 13, marginTop: 6 },
  servingsLabel: { color: t.text, fontSize: 14, fontWeight: '600', marginBottom: 10 },
  servingsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 16 },
  servingBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: t.surface, borderWidth: 1, borderColor: t.border,
    alignItems: 'center', justifyContent: 'center',
  },
  servingBtnText: { color: t.text, fontSize: 20, fontWeight: '700' },
  servingsInput: {
    backgroundColor: t.inputBg, borderWidth: 1, borderColor: t.border,
    borderRadius: 8, padding: 10, color: t.text, fontSize: 18, fontWeight: '700',
    textAlign: 'center', width: 80,
  },
  servingPreview: {
    backgroundColor: t.surface, borderWidth: 1, borderColor: t.border,
    borderRadius: 8, padding: 12, marginBottom: 20,
  },
  previewLabel: { color: t.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 4 },
  previewText: { color: t.text, fontSize: 13, lineHeight: 18 },
  confirmButton: {
    backgroundColor: t.accent, borderRadius: 8, padding: 15,
    alignItems: 'center', minHeight: 48, justifyContent: 'center',
  },
  confirmButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
  backButton: { padding: 12, alignItems: 'center', marginTop: 4 },
  backButtonText: { color: t.accent, fontSize: 14, fontWeight: '600' },
})
