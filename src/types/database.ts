// Hand-written types matching supabase/migrations/0001_init.sql.
// Once the schema stabilizes, replace this with generated types:
//   npx supabase gen types typescript --project-id <ref> > src/types/database.ts

export type ActivityType = 'stretch' | 'mobility' | 'strength' | 'power' | 'anaerobic' | 'aerobic'
export type Laterality = 'unilateral' | 'bilateral' | 'n/a'
export type SetKind = 'warm-up' | 'work'
export type Phase = 'preparatory' | 'training' | 'recovery'
export type SessionStatus = 'planned' | 'in_progress' | 'completed'
export type Environment = 'indoor' | 'outdoor' | 'both'
export type WeighInPeriod = 'morning' | 'evening'

export type RatingScaleKey =
  | 'recovery'
  | 'session_fatigue'
  | 'pain_intensity'
  | 'session_focus'
  | 'sleep_quality'
  | 'energy_level'
  | 'stress_management'
  | 'focus_level'
  | 'work_life_balance'
  | 'noise'
  | 'light'
  | 'temperature'
  | 'humidity'

// Per-activity-type shapes for the `activities.details` / `planned_sets.details`
// / `actual_sets.details` jsonb columns.
export interface StretchDetails {
  laterality?: Laterality
  duration_sec?: number
  rest_sec?: number
  repeat_count?: number
  notes?: string
}

export interface MobilityDetails extends StretchDetails {
  range_of_motion?: string
}

export interface StrengthDetails {
  set_kind?: SetKind
  laterality?: Laterality
  range_of_motion?: string
  target_bar_speed_mps?: number
  tempo?: string // "#-#-#-#"
  target_reps_min?: number
  target_reps_max?: number
  target_weight_lbs?: number
  is_bodyweight_default?: boolean
  accommodating_resistance?: string
  target_rpe?: number
  target_rir?: number
  rest_sec?: number
}

export interface PowerDetails extends StrengthDetails {
  target_height_in?: number
  target_speed_mps?: number
  target_distance_m?: number
}

export interface AnaerobicDetails {
  set_kind?: SetKind
  target_reps_min?: number
  target_reps_max?: number
  target_distance_m?: number
  target_duration_sec?: number
  target_weight_lbs?: number
  target_rpe?: number
  target_rir?: number
  target_pace?: string
  rest_sec?: number
}

export interface AerobicDetails {
  distance_miles?: number
  target_pace?: string // mm:ss per mile
  weight_lbs?: number
  target_heart_rate?: number
  target_cadence?: number
  rest_sec?: number
}

export type ActivityDetails =
  | StretchDetails
  | MobilityDetails
  | StrengthDetails
  | PowerDetails
  | AnaerobicDetails
  | AerobicDetails

export interface Modality {
  id: string
  key: string
  label: string
  sort_order: number
  created_at: string
}

export interface RatingDescription {
  scale_key: RatingScaleKey
  rating: number
  description: string
}

export interface Activity {
  id: string
  type: ActivityType
  name: string
  details: ActivityDetails
  notes: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export interface Session {
  id: string
  session_date: string
  status: SessionStatus
  perceived_recovery: number | null
  environment: Environment | null
  temperature_f: number | null
  humidity_pct: number | null
  start_time: string | null
  session_fatigue: number | null
  pain_intensity: number | null
  session_focus: number | null
  created_at: string
  updated_at: string
}

export interface SessionPhase {
  id: string
  session_id: string
  phase: Phase
  sort_order: number
}

export interface SessionActivity {
  id: string
  phase_id: string
  activity_id: string
  sort_order: number
  notes: string | null
}

export interface PlannedSet {
  id: string
  session_activity_id: string
  set_number: number
  details: ActivityDetails
}

export interface ActualSet {
  id: string
  planned_set_id: string | null
  session_activity_id: string
  set_number: number
  details: ActivityDetails
  completed_at: string
}

export interface SleepLog {
  id: string
  log_date: string
  quality: number | null
  noise: number | null
  light: number | null
  temperature_rating: number | null
  humidity_rating: number | null
  subjective_completed_at: string | null
  bedtime: string | null
  wake_time: string | null
  total_hours_slept: number | null
  wearable_sleep_score: number | null
  temperature_f: number | null
  humidity_pct: number | null
  objective_completed_at: string | null
  created_at: string
  updated_at: string
}

export interface WeightLog {
  id: string
  log_date: string
  period: WeighInPeriod
  weight_lbs: number
  logged_at: string
  created_at: string
}

export interface ReadinessLog {
  id: string
  log_date: string
  energy_level: number | null
  mental_focus: number | null
  stress_level: number | null
  work_life_balance: number | null
  notes: string | null
  reading: string | null
  reading_notes: string | null
  listening: string | null
  listening_notes: string | null
  created_at: string
  updated_at: string
}

export interface NutritionLog {
  id: string
  log_date: string
  water_oz_1: number
  water_oz_2: number
  water_oz_3: number
  water_1_taken: boolean
  water_2_taken: boolean
  water_3_taken: boolean
  milk_oz_1: number
  milk_oz_2: number
  milk_1_taken: boolean
  milk_2_taken: boolean
  fruit_1: string | null
  fruit_2: string | null
  fruit_3: string | null
  fruit_4: string | null
  fruit_1_taken: boolean
  fruit_2_taken: boolean
  fruit_3_taken: boolean
  fruit_4_taken: boolean
  vegetable_1: string | null
  vegetable_2: string | null
  vegetable_3: string | null
  vegetable_4: string | null
  vegetable_1_taken: boolean
  vegetable_2_taken: boolean
  vegetable_3_taken: boolean
  vegetable_4_taken: boolean
  multivitamin_taken: boolean
  creatine_taken: boolean
  coffee_caffeine_mg_1: number
  coffee_caffeine_mg_2: number
  coffee_caffeine_mg_3: number
  coffee_1_taken: boolean
  coffee_2_taken: boolean
  coffee_3_taken: boolean
  preworkout_caffeine_mg: number
  preworkout_taken: boolean
  additional_water_oz: number
  additional_milk_oz: number
  additional_fruit_servings: number
  additional_vegetable_servings: number
  additional_caffeine_mg: number
  created_at: string
  updated_at: string
}

// Minimal Database shape so `createClient<Database>()` gets table name
// completion without hand-writing full Row/Insert/Update generics yet.
export type Database = {
  public: {
    Tables: {
      modalities: { Row: Modality; Insert: Partial<Modality>; Update: Partial<Modality> }
      rating_descriptions: {
        Row: RatingDescription
        Insert: Partial<RatingDescription>
        Update: Partial<RatingDescription>
      }
      activities: { Row: Activity; Insert: Partial<Activity>; Update: Partial<Activity> }
      sessions: { Row: Session; Insert: Partial<Session>; Update: Partial<Session> }
      session_phases: { Row: SessionPhase; Insert: Partial<SessionPhase>; Update: Partial<SessionPhase> }
      session_activities: {
        Row: SessionActivity
        Insert: Partial<SessionActivity>
        Update: Partial<SessionActivity>
      }
      planned_sets: { Row: PlannedSet; Insert: Partial<PlannedSet>; Update: Partial<PlannedSet> }
      actual_sets: { Row: ActualSet; Insert: Partial<ActualSet>; Update: Partial<ActualSet> }
      sleep_logs: { Row: SleepLog; Insert: Partial<SleepLog>; Update: Partial<SleepLog> }
      weight_logs: { Row: WeightLog; Insert: Partial<WeightLog>; Update: Partial<WeightLog> }
      readiness_logs: { Row: ReadinessLog; Insert: Partial<ReadinessLog>; Update: Partial<ReadinessLog> }
      nutrition_logs: { Row: NutritionLog; Insert: Partial<NutritionLog>; Update: Partial<NutritionLog> }
    }
  }
}
