-- Real account deactivation. Deactivating a user bans them in Supabase
-- Auth (blocks login) via the set-user-active Edge Function, which also
-- flips this flag so the UI can filter/display status without needing
-- an admin-only auth.admin lookup on every page load.

alter table public.users add column is_active boolean not null default true;
