-- Sessions redesign: curriculum stage (alongside the existing format
-- "type"), a real facilitator (FK, not free text), learning
-- objectives, a resources link, and a lifecycle status with a guard
-- against marking a future session "active".

alter table public.sessions
  add column stage text check (stage in ('ideation', 'validation', 'building', 'testing', 'launch')),
  add column learning_objectives text,
  add column resources_url text,
  add column status text not null default 'scheduled'
    check (status in ('scheduled', 'active', 'completed', 'cancelled')),
  add column facilitator_id uuid references public.users (id);

alter table public.sessions drop column facilitator;

create index on public.sessions (facilitator_id);

create function public.protect_session_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'active' and new.start_time > now() then
    raise exception 'Cannot set a future session to active';
  end if;
  return new;
end;
$$;

create trigger protect_session_status_trigger
  before insert or update on public.sessions
  for each row execute function public.protect_session_status();

-- ============================================================
-- Narrow name lookup: students can only select their own row in
-- public.users (RLS), so they have no way to resolve a session's
-- facilitator_id to a display name. This exposes just id + full_name
-- for a given set of ids to any authenticated user — not the full
-- profile row.
-- ============================================================

create function public.get_user_names(p_ids uuid[])
returns table (id uuid, full_name text)
language sql
stable
security definer
set search_path = public
as $$
  select id, full_name from public.users where id = any(p_ids);
$$;

grant execute on function public.get_user_names(uuid[]) to authenticated;
