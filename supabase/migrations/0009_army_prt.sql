-- "Army PRT" sessions: a fixed, externally-run workout that doesn't
-- advance any training goal beyond accumulating aerobic minutes and
-- touching a few modalities for the week. Planning one just marks the day
-- rather than building out phases/activities/sets; tracking one just
-- checks off which modalities were used and logs an aerobic duration.
alter table sessions
  add column session_type text not null default 'standard' check (session_type in ('standard', 'army_prt')),
  add column prt_modality_ids uuid[] not null default '{}'::uuid[],
  add column prt_aerobic_duration_sec integer;
