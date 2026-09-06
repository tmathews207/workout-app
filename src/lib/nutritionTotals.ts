import type { NutritionLog } from '../types/database'

// Pick just the fields each total needs, rather than the full row shape —
// callers merging in defaults for an unsaved day don't have id/log_date/etc.
type WaterFields = Pick<NutritionLog, 'water_1_taken' | 'water_2_taken' | 'water_3_taken' | 'water_oz_1' | 'water_oz_2' | 'water_oz_3' | 'additional_water_oz'>
type MilkFields = Pick<NutritionLog, 'milk_1_taken' | 'milk_2_taken' | 'milk_oz_1' | 'milk_oz_2' | 'additional_milk_oz'>
type FruitFields = Pick<NutritionLog, 'fruit_1_taken' | 'fruit_2_taken' | 'fruit_3_taken' | 'fruit_4_taken' | 'additional_fruit_servings'>
type VegetableFields = Pick<
  NutritionLog,
  'vegetable_1_taken' | 'vegetable_2_taken' | 'vegetable_3_taken' | 'vegetable_4_taken' | 'additional_vegetable_servings'
>
type CaffeineFields = Pick<
  NutritionLog,
  | 'coffee_1_taken'
  | 'coffee_2_taken'
  | 'coffee_3_taken'
  | 'coffee_caffeine_mg_1'
  | 'coffee_caffeine_mg_2'
  | 'coffee_caffeine_mg_3'
  | 'preworkout_taken'
  | 'preworkout_caffeine_mg'
  | 'additional_caffeine_mg'
>

export function waterTotal(log: WaterFields | null | undefined) {
  if (!log) return 0
  return (
    (log.water_1_taken ? log.water_oz_1 : 0) +
    (log.water_2_taken ? log.water_oz_2 : 0) +
    (log.water_3_taken ? log.water_oz_3 : 0) +
    log.additional_water_oz
  )
}

export function milkTotal(log: MilkFields | null | undefined) {
  if (!log) return 0
  return (log.milk_1_taken ? log.milk_oz_1 : 0) + (log.milk_2_taken ? log.milk_oz_2 : 0) + log.additional_milk_oz
}

export function fruitTotal(log: FruitFields | null | undefined) {
  if (!log) return 0
  return (
    [log.fruit_1_taken, log.fruit_2_taken, log.fruit_3_taken, log.fruit_4_taken].filter(Boolean).length +
    log.additional_fruit_servings
  )
}

export function vegetableTotal(log: VegetableFields | null | undefined) {
  if (!log) return 0
  return (
    [log.vegetable_1_taken, log.vegetable_2_taken, log.vegetable_3_taken, log.vegetable_4_taken].filter(Boolean).length +
    log.additional_vegetable_servings
  )
}

export function caffeineTotal(log: CaffeineFields | null | undefined) {
  if (!log) return 0
  return (
    (log.coffee_1_taken ? log.coffee_caffeine_mg_1 : 0) +
    (log.coffee_2_taken ? log.coffee_caffeine_mg_2 : 0) +
    (log.coffee_3_taken ? log.coffee_caffeine_mg_3 : 0) +
    (log.preworkout_taken ? log.preworkout_caffeine_mg : 0) +
    log.additional_caffeine_mg
  )
}
