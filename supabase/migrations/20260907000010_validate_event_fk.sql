-- ============================================================================
-- PHOTOWALKS IN PUNE — 0025 · THE LAST THREE ROWS, WITHOUT DELETING ANYBODY
-- ----------------------------------------------------------------------------
-- Migration 0024 added the foreign key on walk_rsvps.event_id as NOT VALID,
-- because three rows point at `walk-02` and `walk-03` — ids that left
-- data/events.ts when commit 7ea8564 removed the sample walks. It said the
-- choice was to remap them or delete them, and that both were decisions for a
-- person rather than a migration.
--
-- There is a third answer, and it costs nobody anything.
--
-- public.walks is not the walks. Its own header says so: walks are content and
-- live in data/events.ts, and this table holds only the two facts the database
-- has to be able to enforce — an id, and a capacity. Recording that `walk-02`
-- and `walk-03` existed is therefore not inventing a walk. It is stating
-- something already true: three members signed up for those ids, and the rows
-- proving it have been sitting in walk_rsvps ever since.
--
-- So the ids are backfilled, the constraint validates, and not one member's
-- record is touched.
--
--   walk-02  2026-08-23  Balewadi / The New City      1 signup
--   walk-03  2026-08-30  Market / People of Mandai    2 signups
--
-- WHY NOT DELETE THEM
-- It was the tempting option, and commit 7ea8564 gives it cover: those walks
-- were sample data, "invented walks with invented meeting points", so the
-- signups were to events that never happened. But the same commit is careful
-- about exactly this — it kept the rows deliberately, noting that event_title
-- and event_date are copied onto each row "precisely so an RSVP survives its
-- walk being edited or removed from this file", and that /my-walks would still
-- show those three people what they joined. Deleting them now to tidy a
-- constraint would undo a decision somebody already made on purpose, for the
-- benefit of a number nobody sees.
--
-- WHAT VALIDATING ACTUALLY BUYS
-- The key already refuses new rows; that landed in 0024 and is why an invented
-- event_id answers 23503 today. Validation only converts the guarantee from
-- "every row from here on" to "every row, including the ones already there" —
-- which is what lets a future reader trust the column without checking, and
-- what stops the constraint sitting permanently in the half-state that anybody
-- auditing this schema would have to stop and understand.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1 · THE TWO IDS THAT WERE ALWAYS REAL TO SOMEBODY
-- ---------------------------------------------------------------------------
-- Capacity 25, matching every other walk in the file at the time. It is not
-- enforced against anything — both walks are long past and the cutoff trigger
-- refuses an RSVP after 6pm on the day regardless — but the column is NOT NULL
-- and a number that matches its neighbours is more honest than a zero that
-- implies the walk was full.
--
-- synced_at defaults to now(), which is accurate: this is when the row was
-- written, and scripts/sync-walk-capacity.mjs will leave both alone because it
-- upserts from data/events.ts and never deletes what it does not recognise.

insert into public.walks (id, capacity)
values
  ('walk-02', 25),
  ('walk-03', 25)
on conflict (id) do nothing;

comment on table public.walks is
  'Walk ids and their capacity, for the checks the database has to make. Not the walks themselves — those are content, in data/events.ts. Two ids here (walk-02, walk-03) predate the current scheme and exist only so the RSVPs that reference them stay valid; see migration 0025.';

-- ---------------------------------------------------------------------------
-- 2 · NOW THE KEY CAN BE VALIDATED
-- ---------------------------------------------------------------------------
-- Takes a SHARE UPDATE EXCLUSIVE lock and scans the table once. On a few
-- hundred rows that is instant, and it does not block reads or new RSVPs.

alter table public.walk_rsvps validate constraint walk_rsvps_event_id_fkey;

comment on constraint walk_rsvps_event_id_fkey on public.walk_rsvps is
  'An RSVP may only name a walk that exists. Validated in migration 0025, after the two historical ids were recorded rather than the rows that used them deleted.';
