-- Single-user app: any authenticated request may read/write everything.
-- Public (anon) access is granted table-by-table only where you want data shown
-- publicly — see 0003_public_access.sql for the pattern.

alter table modalities enable row level security;
alter table rating_descriptions enable row level security;
alter table activities enable row level security;
alter table activity_modalities enable row level security;
alter table sessions enable row level security;
alter table session_phases enable row level security;
alter table session_activities enable row level security;
alter table planned_sets enable row level security;
alter table actual_sets enable row level security;
alter table sleep_logs enable row level security;
alter table weight_logs enable row level security;
alter table readiness_logs enable row level security;

do $$
declare
  t text;
begin
  for t in
    select unnest(array[
      'modalities', 'rating_descriptions', 'activities', 'activity_modalities',
      'sessions', 'session_phases', 'session_activities', 'planned_sets', 'actual_sets',
      'sleep_logs', 'weight_logs', 'readiness_logs'
    ])
  loop
    execute format(
      'create policy "authenticated full access" on %I for all using (auth.role() = ''authenticated'') with check (auth.role() = ''authenticated'');',
      t
    );
  end loop;
end $$;
