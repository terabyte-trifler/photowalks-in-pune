-- ============================================================================
-- PHOTOWALKS IN PUNE — 0021 · CAPACITY IS NOT A DISABLED BUTTON
-- ----------------------------------------------------------------------------
-- `capacity` lives in data/events.ts and spotsRemaining() computes what is
-- left, but nothing in the database consulted either. The only thing between a
-- member and a full walk was disabled={full} on a button — and this project
-- already knows what that is worth: migration 0014 exists precisely because
-- "a disabled button is a courtesy" and anyone can post to PostgREST directly.
--
-- WHAT THIS TABLE IS, AND IS NOT
-- It is not the walks. Walks are content — title, description, theme,
-- photograph, itinerary — and content belongs in data/events.ts where it can be
-- written and reviewed like prose. This table holds only the two facts the
-- database has to be able to enforce, which it cannot do from a TypeScript
-- file. Everything else stays where it is.
--
-- Keeping them in step is scripts/sync-walk-capacity.mjs. Forgetting to run it
-- fails safely: an unknown walk is not refused, it is simply unenforced, which
-- is exactly the behaviour that exists today.
--
-- WHY NOT A FOREIGN KEY FROM walk_rsvps.event_id
-- Because it cannot be added yet, and the reason is worth recording. Three rows
-- in walk_rsvps point at `walk-02` and `walk-03`, ids that no longer exist in
-- data/events.ts:
--
--   walk-02  2026-08-20  'Balewadi / The New City'
--   walk-03  2026-08-21  'Market / People of Mandai'
--   walk-03  2026-08-25  'Market / People of Mandai'
--
-- Those are real RSVPs from real members, orphaned when the id scheme changed
-- to the date-based form. A foreign key would have to either refuse them or
-- delete them, and both are wrong: they are somebody's record of a walk they
-- went on. Remapping them to the right ids is a data decision for the people
-- who ran those walks, not something a migration should guess at. Once they are
-- remapped, the key is one statement and it closes the arbitrary-event_id hole.
-- ============================================================================

create table if not exists public.walks (
  id        text primary key,
  capacity  integer not null,
  synced_at timestamptz not null default now(),

  constraint walks_capacity_sane check (capacity between 1 and 1000),
  constraint walks_id_shape      check (id ~ '^[a-z0-9-]{1,64}$')
);

comment on table public.walks is
  'Only the facts the database must enforce. Walk content lives in data/events.ts; scripts/sync-walk-capacity.mjs keeps the ids and capacities here in step.';

alter table public.walks enable row level security;

-- Readable by anybody: capacity is already public — it is rendered on the walk
-- card as "N spots left". Writable by nobody through the API; the sync script
-- uses the service-role key.
create policy walks_public_read on public.walks for select using (true);
revoke insert, update, delete on public.walks from anon, authenticated;

insert into public.walks (id, capacity) values
  ('walk-next', 30),
  ('walk-2026-08-30', 25),
  ('walk-2026-06-20', 25),
  ('walk-2026-06-27', 25),
  ('walk-2026-07-11', 25),
  ('walk-2026-07-12', 25),
  ('walk-2026-07-15', 25),
  ('walk-2026-07-19', 25),
  ('walk-2026-07-26', 25),
  ('walk-2026-08-08', 25),
  ('walk-2026-08-09', 25),
  ('walk-2026-08-15', 25)
on conflict (id) do update set capacity = excluded.capacity, synced_at = now();

-- ---------------------------------------------------------------------------
-- The enforcement
-- ---------------------------------------------------------------------------
-- The `for update` on the walks row is the whole point and not a flourish.
-- Without it, N simultaneous inserts each read the same count(), each sees a
-- free spot, and every one of them succeeds — the walk ends up over capacity by
-- however many people pressed the button in the same second. Taking the row
-- lock first makes those inserts queue behind one another, so each one counts
-- what the previous one actually wrote.
--
-- The lock is on public.walks, not on walk_rsvps: locking a row that already
-- exists is what serialises inserts of rows that do not.
--
-- The same TOCTOU shape exists in enforce_photo_limit (migration 0004), which
-- counts a member's photographs without locking anything. It is a smaller
-- problem — the race gives one member an extra photograph, not a stranger a
-- place on a full walk — but it is the same bug and worth fixing next.
create or replace function public.walk_rsvps_enforce_capacity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_capacity integer;
  v_taken    integer;
begin
  select capacity into v_capacity
    from public.walks
   where id = new.event_id
     for update;

  -- A walk this table has never heard of. Unenforced rather than refused: that
  -- is today's behaviour, and a walk added to data/events.ts before the sync
  -- script runs must not become an outage on the RSVP form.
  if not found then
    return new;
  end if;

  select count(*) into v_taken
    from public.walk_rsvps
   where event_id = new.event_id;

  if v_taken >= v_capacity then
    raise exception 'This walk is full.'
      using errcode = 'check_violation';
  end if;

  return new;
end;
$$;

revoke all on function public.walk_rsvps_enforce_capacity() from public, anon, authenticated;

drop trigger if exists walk_rsvps_enforce_capacity on public.walk_rsvps;
create trigger walk_rsvps_enforce_capacity
  before insert on public.walk_rsvps
  for each row execute function public.walk_rsvps_enforce_capacity();
