-- Tracks whether an invited user has actually accepted (set a
-- password) yet, so the UI can show Pending vs Active instead of
-- treating every invited account as immediately active.

alter table public.users add column invite_accepted_at timestamptz;
