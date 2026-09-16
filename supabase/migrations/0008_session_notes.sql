-- Free-text end-of-session notes (e.g. where pain was felt, what aggravated
-- it, or any other reflection) alongside the existing 1-10 ratings.
-- session_activities.notes already exists (0001_init.sql) and is now
-- exposed in the UI for per-exercise notes — no migration needed for that.
alter table sessions add column session_notes text;
