-- Programme-wide settings — a single row, enforced via a boolean primary key
-- (the only possible value is `true`, so at most one row can ever exist).

create table public.settings (
  id boolean primary key default true,
  programme_name text not null default 'AI x Web3 Builder Venture Programme',
  programme_description text,
  discord_invite_url text,
  notion_url text,
  default_stage text not null default 'ideation'
    check (default_stage in ('ideation', 'validation', 'building', 'testing', 'launch')),
  progress_update_required boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint settings_singleton check (id)
);

insert into public.settings (id) values (true);

alter table public.settings enable row level security;

-- everyone signed in can read; only admins write
create policy "settings_select_authenticated" on public.settings
  for select using (auth.role() = 'authenticated');
create policy "settings_admin_write" on public.settings
  for all using (public.current_user_role() = 'admin')
  with check (public.current_user_role() = 'admin');
