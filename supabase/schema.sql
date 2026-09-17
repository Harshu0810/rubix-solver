-- ============================================================================
-- RuBiX CUBE — Supabase schema + Row Level Security policies
-- ============================================================================

-- ── profiles: metadata for signed-up users ─────────────────────────────────
-- Automatically populated by a trigger when a user signs up via Supabase Auth.
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text check (length(display_name) <= 100),
  created_at timestamptz not null default now()
);

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
-- Rule of thumb applied everywhere below:
--   - "anon" (any visitor, signed in or not) may INSERT telemetry.
--   - "authenticated" users may INSERT with their user_id attached.
--   - Only the admin (authenticated via Supabase Auth) may SELECT or DELETE.
--     There is no public signup restriction — regular users can sign up,
--     but the admin is distinguished by email check in the app layer.
--     All authenticated users can read their OWN profiles row.
-- ============================================================================

-- ── profiles RLS ────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;

drop policy if exists "users can read own profile" on public.profiles;
create policy "users can read own profile" on public.profiles
  for select to authenticated using (auth.uid() = id);

drop policy if exists "admin can read all profiles" on public.profiles;
create policy "admin can read all profiles" on public.profiles
  for select to authenticated using (true);

-- ── sessions RLS ────────────────────────────────────────────────────────────
alter table public.sessions enable row level security;

drop policy if exists "anon can insert sessions" on public.sessions;
create policy "anon can insert sessions" on public.sessions
  for insert to anon, authenticated with check (true);

drop policy if exists "admin can read sessions" on public.sessions;
create policy "admin can read sessions" on public.sessions
  for select to authenticated using (true);

-- ── events RLS ──────────────────────────────────────────────────────────────
alter table public.events enable row level security;

drop policy if exists "anon can insert events" on public.events;
create policy "anon can insert events" on public.events
  for insert to anon, authenticated with check (true);

drop policy if exists "admin can read events" on public.events;
create policy "admin can read events" on public.events
  for select to authenticated using (true);

-- ── solves RLS ──────────────────────────────────────────────────────────────
alter table public.solves enable row level security;

drop policy if exists "anon can insert solves" on public.solves;
create policy "anon can insert solves" on public.solves
  for insert to anon, authenticated with check (true);

drop policy if exists "admin can read solves" on public.solves;
create policy "admin can read solves" on public.solves
  for select to authenticated using (true);

-- ── feedback RLS ────────────────────────────────────────────────────────────
alter table public.feedback enable row level security;

drop policy if exists "anon can insert feedback" on public.feedback;
create policy "anon can insert feedback" on public.feedback
  for insert to anon, authenticated with check (true);

drop policy if exists "admin can read feedback" on public.feedback;
create policy "admin can read feedback" on public.feedback
  for select to authenticated using (true);

drop policy if exists "admin can delete feedback" on public.feedback;
create policy "admin can delete feedback" on public.feedback
  for delete to authenticated using (true);

drop policy if exists "admin can delete solves" on public.solves;
create policy "admin can delete solves" on public.solves
  for delete to authenticated using (true);

-- No UPDATE policies are created anywhere — nobody can edit existing rows,
-- including the admin, which is fine for an append-only telemetry log.

-- Helpful indexes for the dashboard's "most recent" queries.
create index if not exists solves_created_at_idx on public.solves (created_at desc);
create index if not exists feedback_created_at_idx on public.feedback (created_at desc);
create index if not exists solves_user_id_idx on public.solves (user_id);
create index if not exists feedback_user_id_idx on public.feedback (user_id);
