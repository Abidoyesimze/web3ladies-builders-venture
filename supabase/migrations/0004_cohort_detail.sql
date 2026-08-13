-- Adds a per-cohort programme name, a 4th "archived" cohort status,
-- and real mentor-to-student assignment (admin-facing only for now —
-- mentor-facing pages still show the whole cohort, this just powers
-- the assigned-student count on the admin cohort detail page).

alter table public.cohorts add column programme text;

alter table public.cohorts drop constraint cohorts_status_check;
alter table public.cohorts add constraint cohorts_status_check
  check (status in ('upcoming', 'active', 'completed', 'archived'));

create table public.mentor_assignments (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.users (id) on delete cascade,
  student_id uuid not null references public.users (id) on delete cascade,
  assigned_by uuid not null references public.users (id),
  created_at timestamptz not null default now(),
  unique (mentor_id, student_id)
);

create index on public.mentor_assignments (mentor_id);
create index on public.mentor_assignments (student_id);

alter table public.mentor_assignments enable row level security;

create policy "mentor_assignments_select_mentor_admin" on public.mentor_assignments
  for select using (public.current_user_role() in ('mentor', 'admin'));
create policy "mentor_assignments_admin_write" on public.mentor_assignments
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');
