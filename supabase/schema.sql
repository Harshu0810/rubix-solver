-- ============================================================================
-- RuBiX CUBE — Supabase schema + Row Level Security policies
-- ============================================================================

-- ── profiles: metadata for signed-up users ─────────────────────────────────
-- Automatically populated by a trigger when a user signs up via Supabase Auth.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text check (length(display_name) <= 100),
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

-- Safe to re-run on a database created from an earlier version of this file,
-- which didn't have this column yet.
alter table public.profiles add column if not exists is_admin boolean not null default false;

-- Trigger function: copies email and optional display_name from auth metadata
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

-- Drop and recreate trigger to be safe on re-runs
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── sessions: one row per visitor session ──────────────────────────────────
create table if not exists public.sessions (
  id text primary key,
  created_at timestamptz not null default now(),
  user_agent text,
  screen_width int
);

-- ── events: generic telemetry (page views, funnel steps, etc.) ─────────────
create table if not exists public.events (
  id bigint generated always as identity primary key,
  session_id text not null,
  event text not null check (length(event) <= 60),
  payload jsonb,
  created_at timestamptz not null default now()
);

-- ── solves: a record of each successful solve computation ──────────────────
create table if not exists public.solves (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  user_id uuid references auth.users(id) on delete set null,
  move_count int check (move_count between 0 and 200),
  solve_time_ms int check (solve_time_ms between 0 and 60000),
  raw_solution text check (length(raw_solution) <= 2000),
  was_valid boolean not null default true,
  created_at timestamptz not null default now()
);

-- ── feedback: written user feedback + star rating ───────────────────────────
create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  user_id uuid references auth.users(id) on delete set null,
  rating int not null check (rating between 1 and 5),
  category text check (length(category) <= 100),
  comment text check (length(comment) <= 1000),
  created_at timestamptz not null default now()
);

-- ============================================================================
-- Row Level Security
--
-- IMPORTANT — this replaces an earlier version of this file where every
-- "admin" policy below was written as `using (true)`, which really meant
-- "any signed-in user" rather than "the admin". Since regular visitors can
-- sign up (to unlock downloads), that let any registered account read every
-- row of sessions/events/solves/feedback/profiles — including every other
-- user's email address — by querying the tables directly, regardless of
-- what the admin.js page in the UI checked. Admin status now depends on the
-- `profiles.is_admin` column below, not just "authenticated".
--
-- After running this file, make yourself the admin (Supabase dashboard →
-- Table Editor → profiles → find your row by email → set is_admin to true).
-- Only ever flip this on for accounts you control.
--
-- Rule of thumb applied everywhere below:
--   - "anon" (any visitor, signed in or not) may INSERT telemetry.
--   - "authenticated" users may INSERT with their user_id attached.
--   - Only a profile with is_admin = true may SELECT or DELETE the tables
--     below. Every other signed-in user can only read their OWN profile row.
-- ============================================================================

-- Helper used inside RLS policies to check "is this request's user an
-- admin?". SECURITY DEFINER + querying profiles directly (rather than going
-- through the profiles table's own RLS) is required here, otherwise the
-- profiles SELECT policy calling this function would recurse into itself.
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce((select is_admin from public.profiles where id = uid), false);
$$;

-- ── profiles RLS ────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;

drop policy if exists "users can read own profile" on public.profiles;
create policy "users can read own profile" on public.profiles
  for select to authenticated using (auth.uid() = id);

drop policy if exists "admin can read all profiles" on public.profiles;
create policy "admin can read all profiles" on public.profiles
  for select to authenticated using (public.is_admin(auth.uid()));

-- ── sessions RLS ────────────────────────────────────────────────────────────
alter table public.sessions enable row level security;

drop policy if exists "anon can insert sessions" on public.sessions;
create policy "anon can insert sessions" on public.sessions
  for insert to anon, authenticated with check (true);

drop policy if exists "admin can read sessions" on public.sessions;
create policy "admin can read sessions" on public.sessions
  for select to authenticated using (public.is_admin(auth.uid()));

-- ── events RLS ──────────────────────────────────────────────────────────────
alter table public.events enable row level security;

drop policy if exists "anon can insert events" on public.events;
create policy "anon can insert events" on public.events
  for insert to anon, authenticated with check (true);

drop policy if exists "admin can read events" on public.events;
create policy "admin can read events" on public.events
  for select to authenticated using (public.is_admin(auth.uid()));

-- ── solves RLS ──────────────────────────────────────────────────────────────
alter table public.solves enable row level security;

drop policy if exists "anon can insert solves" on public.solves;
create policy "anon can insert solves" on public.solves
  for insert to anon, authenticated with check (true);

drop policy if exists "admin can read solves" on public.solves;
create policy "admin can read solves" on public.solves
  for select to authenticated using (public.is_admin(auth.uid()));

-- ── feedback RLS ────────────────────────────────────────────────────────────
alter table public.feedback enable row level security;

drop policy if exists "anon can insert feedback" on public.feedback;
create policy "anon can insert feedback" on public.feedback
  for insert to anon, authenticated with check (true);

drop policy if exists "admin can read feedback" on public.feedback;
create policy "admin can read feedback" on public.feedback
  for select to authenticated using (public.is_admin(auth.uid()));

drop policy if exists "admin can delete feedback" on public.feedback;
create policy "admin can delete feedback" on public.feedback
  for delete to authenticated using (public.is_admin(auth.uid()));

drop policy if exists "admin can delete solves" on public.solves;
create policy "admin can delete solves" on public.solves
  for delete to authenticated using (public.is_admin(auth.uid()));

-- No UPDATE policies are created anywhere — nobody can edit existing rows,
-- including the admin, which is fine for an append-only telemetry log.

-- Helpful indexes for the dashboard's "most recent" queries.
create index if not exists solves_created_at_idx on public.solves (created_at desc);
create index if not exists feedback_created_at_idx on public.feedback (created_at desc);
create index if not exists solves_user_id_idx on public.solves (user_id);
create index if not exists feedback_user_id_idx on public.feedback (user_id);
