-- Add Google Meet as a session location option.

alter table public.sessions drop constraint sessions_location_check;
alter table public.sessions add constraint sessions_location_check
  check (location in ('discord', 'zoom', 'in-person', 'google-meet'));
