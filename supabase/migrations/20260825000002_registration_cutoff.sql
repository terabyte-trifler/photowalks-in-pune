-- ============================================================================
-- PHOTOWALKS IN PUNE — 0014 · REGISTRATION CLOSES AT SIX ON THE DAY
-- ----------------------------------------------------------------------------
-- Nothing stopped somebody joining a walk that had already happened. The RSVP
-- buttons are disabled past the cutoff now, but a disabled button is a
-- courtesy: the homepage is prerendered and revalidates on a timer, so a copy
-- of it outlives the cutoff, and anyone can post to PostgREST directly. The
-- rule belongs where the row is written.
--
-- Six in the evening, Pune time, on the walk's own date. Walks run from early
-- morning to about five, so this is after the last of them has finished and
-- before the day turns over.
--
-- The matching client-side check is `registrationClosed` in lib/utils.ts. Keep
-- the hour in the two in step: this file is the guard, that one is the
-- explanation people actually see.
--
-- WHAT THIS CAN AND CANNOT ENFORCE
-- Walks live in data/events.ts, not in the database, so `event_date` arrives
-- with the insert rather than being looked up. A determined member could
-- therefore post a date that is not the walk's. That is worth knowing and not
-- worth defending against here: the only row they can write is their own, and
-- lying about the date puts a wrong date on their own /my-walks page while
-- their spot still counts against a walk the organiser reads by `event_id`.
-- When walks become a table, this reads the date from there and the gap shuts.
-- ============================================================================

create or replace function public.walk_rsvps_registration_open()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_closes timestamptz;
begin
  /* Date plus wall-clock time, read as a Pune instant. Asia/Kolkata rather
     than a written-out +05:30, because the database is the one place that
     should be asked rather than told. India has no daylight saving, so the two
     agree — but only one of them keeps agreeing if that ever changes. */
  v_closes := (new.event_date + time '18:00') at time zone 'Asia/Kolkata';

  if now() >= v_closes then
    raise exception
      'Registration for this walk closed at 6pm on %', new.event_date
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

comment on function public.walk_rsvps_registration_open() is
  'Refuses an RSVP written at or after 18:00 IST on the walk''s own date.';

drop trigger if exists walk_rsvps_registration_open on public.walk_rsvps;

-- BEFORE INSERT only. There is no UPDATE policy on this table, and a member
-- cancelling a walk they can no longer attend must keep working after the
-- cutoff — a closed walk should not trap people on the attendance list.
create trigger walk_rsvps_registration_open
  before insert on public.walk_rsvps
  for each row
  execute function public.walk_rsvps_registration_open();
