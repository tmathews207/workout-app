-- Example pattern for publicly displaying data: expose a narrow, read-only
-- view rather than opening RLS on the underlying tables, then grant SELECT
-- to the `anon` role on just that view. Adjust or add views as you decide
-- what you actually want visible on the public page.

create view public_weekly_training_summary as
select
  date_trunc('week', s.session_date)::date as week_start,
  count(distinct s.id) as sessions_completed,
  count(distinct case when a.type = 'aerobic' then s.id end) as aerobic_sessions,
  count(distinct m.key) as modalities_trained
from sessions s
join session_phases sp on sp.session_id = s.id
join session_activities sa on sa.phase_id = sp.id
join activities a on a.id = sa.activity_id
left join activity_modalities am on am.activity_id = a.id
left join modalities m on m.id = am.modality_id
where s.status = 'completed'
group by 1
order by 1 desc;

grant select on public_weekly_training_summary to anon;
