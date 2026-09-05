-- Daily nutrition tracking: water, milk, fruit/veg servings, multivitamin,
-- creatine, and caffeine. Fixed set of "tiles" per day (see app UI) plus an
-- "additional" catch-all for anything beyond the tiles.

create table nutrition_logs (
  id uuid primary key default gen_random_uuid(),
  log_date date not null unique,

  water_oz_1 numeric not null default 20,
  water_oz_2 numeric not null default 20,
  water_oz_3 numeric not null default 20,

  milk_oz_1 numeric not null default 20,
  milk_oz_2 numeric not null default 20,

  fruit_1 text,
  fruit_2 text,
  fruit_3 text,
  fruit_4 text,

  vegetable_1 text,
  vegetable_2 text,
  vegetable_3 text,
  vegetable_4 text,

  multivitamin_taken boolean not null default false,
  creatine_taken boolean not null default false,

  coffee_caffeine_mg_1 numeric not null default 90,
  coffee_caffeine_mg_2 numeric not null default 90,
  coffee_caffeine_mg_3 numeric not null default 90,
  preworkout_caffeine_mg numeric not null default 200,

  additional_water_oz numeric not null default 0,
  additional_milk_oz numeric not null default 0,
  additional_fruit_servings numeric not null default 0,
  additional_vegetable_servings numeric not null default 0,
  additional_caffeine_mg numeric not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table nutrition_logs enable row level security;

create policy "authenticated full access" on nutrition_logs
  for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
