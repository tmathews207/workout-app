# Workout Tracker

Personal app for planning and tracking workouts, sleep, body weight, and
mental readiness.

**Stack**: React + Vite + TypeScript (installable PWA), Supabase (Postgres +
Auth), Tailwind CSS, TanStack Query, React Hook Form + Zod, deployed to
GitHub Pages via GitHub Actions.

## Project structure

- `src/pages/sleep` — two-screen sleep entry (subjective ratings, then
  objective data). Fully implemented; the reference pattern for the rest.
- `src/pages/weight`, `readiness`, `sessions`, `library`, `admin` — routed
  and stubbed with `TODO` comments describing what each screen needs.
- `src/types/database.ts` — hand-written types matching the schema, including
  the per-activity-type shapes (`StrengthDetails`, `AerobicDetails`, etc.)
  used in the `activities.details` / `planned_sets.details` / `actual_sets.details`
  jsonb columns.
- `supabase/migrations/` — the full Postgres schema:
  - `0001_init.sql` — tables (`modalities`, `rating_descriptions`, `activities`,
    `sessions` → `session_phases` → `session_activities` → `planned_sets` /
    `actual_sets`, `sleep_logs`, `weight_logs`, `readiness_logs`)
  - `0002_rls.sql` — Row Level Security: any authenticated request can
    read/write everything (this is a single-user app)
  - `0003_public_access.sql` — example of exposing a narrow read-only view
    (`public_weekly_training_summary`) to the public `anon` role. Add more
    views here as you decide what to actually show publicly.
  - `0004_seed.sql` — the fixed modality list and every rating scale's
    descriptions from the spec (both editable later from the admin page).

## Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com)
   (free tier).
2. **Apply the schema**: open the SQL editor in your Supabase project and run
   the four files in `supabase/migrations/` in order — or, if you have the
   [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)
   installed, `supabase link` then `supabase db push`.
3. **Create yourself a user**: Supabase dashboard → Authentication → Users →
   Add user (email/password is simplest for a single-user app).
4. **Local env**: copy `.env.example` to `.env.local` and fill in your
   project's URL and anon key (Supabase dashboard → Project Settings → API).
5. Install and run:
   ```
   npm install
   npm run dev
   ```

Note: the app isn't wired up with a login screen yet — `src/lib/supabase.ts`
exports a configured client, but auth (sign-in form + session handling) still
needs to be added before RLS will let you read/write anything other than the
public view.

## Deploying to GitHub Pages

1. Repo → Settings → Pages → Source: **GitHub Actions**.
2. Repo → Settings → Secrets and variables → Actions → add
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` (same values as your
   `.env.local`).
3. Push to `claude/workout-app-tech-stack-xgw3h2` (this repo's default
   branch — there's no separate `main`) — `.github/workflows/deploy.yml`
   builds and deploys automatically. The site is served from `/workout-app/`, which is why
   `vite.config.ts` sets `base: '/workout-app/'` — update that (and the PWA
   manifest's `start_url`/`scope` in the same file) if the repo is ever
   renamed.

On your iPhone, open the deployed URL in Safari and use Share → Add to Home
Screen to install it as a standalone app.
