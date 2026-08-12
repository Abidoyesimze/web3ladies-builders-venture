-- Web3Ladies Builder Venture LMS — initial schema
-- Run this once in the Supabase SQL Editor (or via `supabase db push`).

-- ============================================================
-- Tables
-- ============================================================

create table public.cohorts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  start_date date not null,
  end_date date not null,
  status text not null default 'upcoming' check (status in ('upcoming', 'active', 'completed')),
  discord_invite_url text,
  notion_url text,
  created_at timestamptz not null default now()
);

create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role text not null check (role in ('student', 'mentor', 'admin')),
  avatar_url text,
  cohort_id uuid references public.cohorts (id) on delete set null,
  bio text,
  timezone text,
  discord_handle text,
  wallet_address text,
  created_at timestamptz not null default now()
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts (id) on delete cascade,
  title text not null,
  description text,
  type text not null check (type in ('live-class', 'workshop', 'office-hours', 'demo-day')),
  start_time timestamptz not null,
  end_time timestamptz not null,
  facilitator text not null,
  location text not null check (location in ('discord', 'zoom', 'in-person')),
  link text,
  created_at timestamptz not null default now()
);

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  student_id uuid not null references public.users (id) on delete cascade,
  status text not null check (status in ('present', 'absent', 'excused')),
  marked_by uuid not null references public.users (id),
  marked_at timestamptz not null default now(),
  unique (session_id, student_id)
);

create table public.intake_forms (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references public.users (id) on delete cascade,
  motivation text not null,
  experience_level text not null check (experience_level in ('beginner', 'intermediate', 'advanced')),
  goals text not null,
  submitted_at timestamptz not null default now()
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references public.users (id) on delete cascade,
  cohort_id uuid not null references public.cohorts (id) on delete cascade,
  name text not null,
  problem_statement text,
  solution text,
  description text,
  current_stage text not null default 'ideation'
    check (current_stage in ('ideation', 'validation', 'building', 'testing', 'launch')),
  demo_url text,
  repo_url text,
  pitch_deck_url text,
  updated_at timestamptz not null default now()
);

create table public.progress_updates (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  student_id uuid not null references public.users (id) on delete cascade,
  summary text not null,
  blockers text,
  created_at timestamptz not null default now()
);

create table public.mentor_comments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  mentor_id uuid not null references public.users (id) on delete cascade,
  student_id uuid not null references public.users (id) on delete cascade,
  comment text not null,
  rating smallint check (rating between 1 and 5),
  created_at timestamptz not null default now()
);

create index on public.users (cohort_id);
create index on public.sessions (cohort_id);
create index on public.attendance_records (session_id);
create index on public.attendance_records (student_id);
create index on public.projects (cohort_id);
create index on public.progress_updates (project_id);
create index on public.mentor_comments (project_id);
create index on public.mentor_comments (student_id);

-- ============================================================
-- Helper: current user's role, bypassing RLS to avoid recursive checks
-- ============================================================

create function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.users where id = auth.uid();
$$;

-- ============================================================
-- Auth sync: create a public.users profile row whenever an admin
-- invites someone via auth.admin.inviteUserByEmail. Expects
-- full_name / role / cohort_id to be passed in the invite's user_metadata.
-- ============================================================

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, full_name, email, role, cohort_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'role', 'student'),
    nullif(new.raw_user_meta_data ->> 'cohort_id', '')::uuid
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Guardrail: only mentors/admins may change a project's current_stage.
-- Students can still update every other project field.
-- ============================================================

create function public.protect_project_stage()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_user_role() = 'student'
     and new.current_stage is distinct from old.current_stage then
    raise exception 'Students cannot change the project stage';
  end if;
  new.updated_at = now();
  return new;
end;
$$;

create trigger protect_project_stage_trigger
  before update on public.projects
  for each row execute function public.protect_project_stage();

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.cohorts enable row level security;
alter table public.users enable row level security;
alter table public.sessions enable row level security;
alter table public.attendance_records enable row level security;
alter table public.intake_forms enable row level security;
alter table public.projects enable row level security;
alter table public.progress_updates enable row level security;
alter table public.mentor_comments enable row level security;

-- cohorts: everyone signed in can read; only admins write
create policy "cohorts_select_authenticated" on public.cohorts
  for select using (auth.role() = 'authenticated');
create policy "cohorts_admin_write" on public.cohorts
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- users: everyone can read their own row; mentors/admins can read all;
-- users can update their own profile; admins can do anything
create policy "users_select_self" on public.users
  for select using (id = auth.uid());
create policy "users_select_mentor_admin" on public.users
  for select using (public.current_user_role() in ('mentor', 'admin'));
create policy "users_update_self" on public.users
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy "users_admin_write" on public.users
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- sessions: everyone signed in can read; only admins write
create policy "sessions_select_authenticated" on public.sessions
  for select using (auth.role() = 'authenticated');
create policy "sessions_admin_write" on public.sessions
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- attendance_records: students read their own; mentors/admins read + write all
create policy "attendance_select_self" on public.attendance_records
  for select using (student_id = auth.uid());
create policy "attendance_select_mentor_admin" on public.attendance_records
  for select using (public.current_user_role() in ('mentor', 'admin'));
create policy "attendance_mentor_admin_write" on public.attendance_records
  for all using (public.current_user_role() in ('mentor', 'admin'))
  with check (public.current_user_role() in ('mentor', 'admin'));

-- intake_forms: students read/insert their own; mentors/admins read all; admins write all
create policy "intake_select_self" on public.intake_forms
  for select using (student_id = auth.uid());
create policy "intake_insert_self" on public.intake_forms
  for insert with check (student_id = auth.uid());
create policy "intake_select_mentor_admin" on public.intake_forms
  for select using (public.current_user_role() in ('mentor', 'admin'));
create policy "intake_admin_write" on public.intake_forms
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- projects: students read/update their own (stage-change blocked by trigger above);
-- mentors/admins read + update all; only admins insert/delete
create policy "projects_select_self" on public.projects
  for select using (student_id = auth.uid());
create policy "projects_select_mentor_admin" on public.projects
  for select using (public.current_user_role() in ('mentor', 'admin'));
create policy "projects_update_self" on public.projects
  for update using (student_id = auth.uid()) with check (student_id = auth.uid());
create policy "projects_update_mentor_admin" on public.projects
  for update using (public.current_user_role() in ('mentor', 'admin'))
  with check (public.current_user_role() in ('mentor', 'admin'));
create policy "projects_admin_insert" on public.projects
  for insert with check (public.current_user_role() = 'admin');
create policy "projects_admin_delete" on public.projects
  for delete using (public.current_user_role() = 'admin');

-- progress_updates: students read/insert their own; mentors/admins read all; admins write all
create policy "progress_select_self" on public.progress_updates
  for select using (student_id = auth.uid());
create policy "progress_insert_self" on public.progress_updates
  for insert with check (student_id = auth.uid());
create policy "progress_select_mentor_admin" on public.progress_updates
  for select using (public.current_user_role() in ('mentor', 'admin'));
create policy "progress_admin_write" on public.progress_updates
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');

-- mentor_comments: students read comments on their own project;
-- mentors read all + insert their own; admins do anything
create policy "comments_select_self" on public.mentor_comments
  for select using (student_id = auth.uid());
create policy "comments_select_mentor_admin" on public.mentor_comments
  for select using (public.current_user_role() in ('mentor', 'admin'));
create policy "comments_insert_mentor" on public.mentor_comments
  for insert with check (
    mentor_id = auth.uid() and public.current_user_role() in ('mentor', 'admin')
  );
create policy "comments_admin_write" on public.mentor_comments
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');
