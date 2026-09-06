-- Manual display order for activities, used everywhere they're listed for
-- selection (library list, "add activity" picker, Progress exercise
-- selector) so frequently-used exercises can be kept near the top.

alter table activities add column sort_order integer not null default 0;

-- Give existing rows distinct starting values (previous default order) so
-- the up/down reordering below has something sane to work from.
with ordered as (
  select id, row_number() over (order by type, name) as rn
  from activities
)
update activities
set sort_order = ordered.rn
from ordered
where activities.id = ordered.id;
