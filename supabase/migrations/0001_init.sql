-- Workout Tracker schema
-- Single-user app: every table is owned by the authenticated user (auth.uid()).
-- Public-facing data should be exposed through dedicated views (see 0003_public_views.sql placeholder).

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Admin-editable reference data
-- ---------------------------------------------------------------------------

create table modalities (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,        -- e.g. 'squat', 'push_upper'
  label text not null,             -- e.g. 'Squat', 'Push (Upper)'
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- Descriptions for every 1-10 / 1-5 rating scale used across the app,
-- editable from the admin page.
create table rating_descriptions (
  scale_key text not null,   -- 'recovery' | 'session_fatigue' | 'pain_intensity' | 'session_focus'
                              -- | 'sleep_quality' | 'energy_level' | 'stress_management'
                              -- | 'focus_level' | 'work_life_balance' | 'noise' | 'light'
                              -- | 'temperature' | 'humidity'
  rating int not null,
  description text not null,
  primary key (scale_key, rating)
);

-- ---------------------------------------------------------------------------
-- Activity library
-- ---------------------------------------------------------------------------

create table activities (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('stretch', 'mobility', 'strength', 'power', 'anaerobic', 'aerobic')),
  name text not null,
  -- Type-specific fields live here rather than as sparse nullable columns, e.g.:
  --   stretch:   { laterality, duration_sec, rest_sec, repeat_count, notes }
  --   mobility:  { laterality, range_of_motion, duration_sec, rest_sec, repeat_count, notes }
  --   strength:  { set_kind, laterality, range_of_motion, target_bar_speed_mps, tempo,
  --                target_reps_min, target_reps_max, target_weight_lbs, is_bodyweight_default,
  --                accommodating_resistance, target_rpe, target_rir, rest_sec }
  --   power:     strength fields + { target_height_in, target_speed_mps, target_distance_m }
  --   anaerobic: { set_kind, target_reps_min, target_reps_max, target_distance_m, target_duration_sec,
  --                target_weight_lbs, target_rpe, target_rir, target_pace, rest_sec }
  --   aerobic:   { distance_miles, target_pace, weight_lbs, target_heart_rate, target_cadence, rest_sec }
  details jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table activity_modalities (
  activity_id uuid not null references activities(id) on delete cascade,
  modality_id uuid not null references modalities(id) on delete restrict,
  primary key (activity_id, modality_id)
);

-- ---------------------------------------------------------------------------
-- Planned & executed sessions
-- ---------------------------------------------------------------------------

create table sessions (
  id uuid primary key default gen_random_uuid(),
  session_date date not null unique,   -- one workout per day
  status text not null default 'planned' check (status in ('planned', 'in_progress', 'completed')),

  -- recorded at the start of execution
  perceived_recovery int check (perceived_recovery between 1 and 10),
  environment text check (environment in ('indoor', 'outdoor', 'both')),
  temperature_f numeric,
  humidity_pct numeric,
  start_time time,

  -- recorded at the end of execution
  session_fatigue int check (session_fatigue between 1 and 10),
  pain_intensity int check (pain_intensity between 1 and 10),
  session_focus int check (session_focus between 1 and 10),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table session_phases (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  phase text not null check (phase in ('preparatory', 'training', 'recovery')),
  sort_order int not null default 0,
  unique (session_id, phase)
);

create table session_activities (
  id uuid primary key default gen_random_uuid(),
  phase_id uuid not null references session_phases(id) on delete cascade,
  activity_id uuid not null references activities(id) on delete restrict,
  sort_order int not null default 0,
  notes text
);

create table planned_sets (
  id uuid primary key default gen_random_uuid(),
  session_activity_id uuid not null references session_activities(id) on delete cascade,
  set_number int not null,
  -- shape mirrors the parent activity's `details` (planned targets for this specific set)
  details jsonb not null default '{}'::jsonb,
  unique (session_activity_id, set_number)
);

create table actual_sets (
  id uuid primary key default gen_random_uuid(),
  planned_set_id uuid references planned_sets(id) on delete set null,
  session_activity_id uuid not null references session_activities(id) on delete cascade,
  set_number int not null,
  details jsonb not null default '{}'::jsonb,
  completed_at timestamptz not null default now(),
  unique (session_activity_id, set_number)
);

-- ---------------------------------------------------------------------------
-- Daily logs
-- ---------------------------------------------------------------------------

create table sleep_logs (
  id uuid primary key default gen_random_uuid(),
  log_date date not null unique,   -- morning the sleep is attributed to

  -- screen 1: subjective (must be completed first)
  quality int check (quality between 1 and 10),
  noise int check (noise between 1 and 5),
  light int check (light between 1 and 5),
  temperature_rating int check (temperature_rating between 1 and 5),
  humidity_rating int check (humidity_rating between 1 and 5),
  subjective_completed_at timestamptz,

  -- screen 2: objective
  bedtime time,
  wake_time time,
  total_hours_slept numeric,
  wearable_sleep_score int,
  temperature_f numeric,
  humidity_pct numeric,
  objective_completed_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint objective_after_subjective check (
    objective_completed_at is null or subjective_completed_at is not null
  )
);

create table weight_logs (
  id uuid primary key default gen_random_uuid(),
  log_date date not null,
  period text not null check (period in ('morning', 'evening')),
  weight_lbs numeric not null,
  logged_at time not null,
  created_at timestamptz not null default now(),
  unique (log_date, period)
);

create table readiness_logs (
  id uuid primary key default gen_random_uuid(),
  log_date date not null unique,
  energy_level int check (energy_level between 1 and 10),
  mental_focus int check (mental_focus between 1 and 10),
  stress_level int check (stress_level between 1 and 10),
  work_life_balance int check (work_life_balance between 1 and 10),
  notes text,
  reading text,
  reading_notes text,
  listening text,
  listening_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Helpful indexes
-- ---------------------------------------------------------------------------

create index idx_activities_type on activities(type);
create index idx_session_phases_session on session_phases(session_id);
create index idx_session_activities_phase on session_activities(phase_id);
create index idx_planned_sets_activity on planned_sets(session_activity_id);
create index idx_actual_sets_activity on actual_sets(session_activity_id);
create index idx_weight_logs_date on weight_logs(log_date);
