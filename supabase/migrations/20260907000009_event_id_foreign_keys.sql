-- ============================================================================
-- PHOTOWALKS IN PUNE — 0024 · event_id BECOMES A REAL REFERENCE
-- ----------------------------------------------------------------------------
-- Migration 0021 built public.walks so capacity could be enforced in the
-- database, and said the matching foreign key could not be added yet:
--
--   "A foreign key would have to either refuse them or delete them, and both
--    are wrong: they are somebody's record of a walk they went on."
--
-- Both are wrong, and there is a third option the note did not consider.
-- `NOT VALID` adds the constraint without checking the rows already there. It
-- is enforced on every insert and every update from this moment on; it simply
-- does not go back and audit history. So the hole closes today and the three
-- orphaned rows keep sitting where they are, untouched, until somebody who ran
-- those walks decides what they should point at.
--
-- WHAT THE HOLE WAS
-- `event_id` was free text with no referent. A member could post any string
-- they liked, and the uniqueness constraint is on (profile_id, event_id), so
-- varying the string gave one account unlimited rows. That bought three
-- things: arbitrary text on a public profile through the copied event_title,
-- an inflated walks_attended that sorts the directory, and — with enough
-- accounts — enough rows against a real walk to make it read "Full" to
-- everybody else while the attacker's own inserts were never refused.
--
-- The last of those is why this had to be fixed alongside capacity rather than
-- after it. Capacity enforcement alone would have started rejecting genuine
-- members on behalf of poisoned rows.
--
-- WHY photos GETS A VALIDATED KEY AND walk_rsvps DOES NOT
-- Because photos has no orphans. Checked before writing this:
--
--   walk_rsvps   walk-02  1 row      photos   (none)
--                walk-03  2 rows
--
-- So one can be validated now and the other cannot, and pretending otherwise
-- would mean either losing three real signups or leaving both unenforced.
--
-- ON DELETE RESTRICT, NOT CASCADE
-- scripts/sync-walk-capacity.mjs upserts and never deletes — it says so, and
-- leaves a walk that has left events.ts alone in the table. So a walks row
-- disappearing is a deliberate act by a person, and the right response is to
-- stop and make them look at what points at it, rather than quietly taking the
-- attendance list and the photographs with it.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1 · PHOTOGRAPHS — validated, because there is nothing to forgive
-- ---------------------------------------------------------------------------
-- Nullable, and most rows are null: 115 of 118 photographs predate the column.
-- A foreign key ignores nulls, so those are unaffected — this only says that a
-- photograph claiming a walk must claim one that exists.

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'photos_event_id_fkey') then
    alter table public.photos
      add constraint photos_event_id_fkey
        foreign key (event_id) references public.walks (id)
        on update cascade
        on delete restrict;
  end if;
end
$$;

comment on constraint photos_event_id_fkey on public.photos is
  'A photograph may only be filed under a walk that exists. Validated: there were no orphans when this was added.';

-- ---------------------------------------------------------------------------
-- 2 · RSVPS — enforced going forward, history left alone
-- ---------------------------------------------------------------------------
-- NOT VALID is the whole point. Postgres enforces this on every insert and
-- update from now on and does not scan what is already there, so walk-02 and
-- walk-03 survive exactly as they are while the column stops accepting
-- invented ids.

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'walk_rsvps_event_id_fkey') then
    alter table public.walk_rsvps
      add constraint walk_rsvps_event_id_fkey
        foreign key (event_id) references public.walks (id)
        on update cascade
        on delete restrict
        not valid;
  end if;
end
$$;

comment on constraint walk_rsvps_event_id_fkey on public.walk_rsvps is
  'An RSVP may only name a walk that exists. NOT VALID: three rows from the old id scheme predate it and are deliberately not audited. See migration 0024.';

-- ---------------------------------------------------------------------------
-- 3 · FINISHING IT LATER
-- ---------------------------------------------------------------------------
-- When somebody who ran those walks has decided what the three rows should
-- point at, remap them and then validate. Validation takes a SHARE UPDATE
-- EXCLUSIVE lock and scans the table once — on three hundred rows that is
-- instant, and it converts the constraint into a guarantee about all of
-- history rather than only about the future:
--
--   select r.profile_id, r.event_id, r.event_title, r.event_date
--   from public.walk_rsvps r
--   left join public.walks w on w.id = r.event_id
--   where w.id is null;
--
--   -- then, once each row points at a real walk:
--   alter table public.walk_rsvps validate constraint walk_rsvps_event_id_fkey;
--
-- Deleting them is also a valid answer — commit 7ea8564 records that Balewadi
-- and Mandai were sample walks that never happened, so these may be signups to
-- events that did not exist. That is still somebody's data and still not a
-- decision for a migration.
