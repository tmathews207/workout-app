-- Each quantity/text tile gets its own "consumed" flag, separate from its
-- value. Tapping a tile toggles this; the value beneath it (oz, mg, or
-- fruit/veg name) is just what gets counted once the tile is tapped. This
-- replaces the previous assume-full-consumption-by-default behavior —
-- nothing counts toward the day's totals until you actually tap the tile.

alter table nutrition_logs
  add column water_1_taken boolean not null default false,
  add column water_2_taken boolean not null default false,
  add column water_3_taken boolean not null default false,
  add column milk_1_taken boolean not null default false,
  add column milk_2_taken boolean not null default false,
  add column fruit_1_taken boolean not null default false,
  add column fruit_2_taken boolean not null default false,
  add column fruit_3_taken boolean not null default false,
  add column fruit_4_taken boolean not null default false,
  add column vegetable_1_taken boolean not null default false,
  add column vegetable_2_taken boolean not null default false,
  add column vegetable_3_taken boolean not null default false,
  add column vegetable_4_taken boolean not null default false,
  add column coffee_1_taken boolean not null default false,
  add column coffee_2_taken boolean not null default false,
  add column coffee_3_taken boolean not null default false,
  add column preworkout_taken boolean not null default false;
