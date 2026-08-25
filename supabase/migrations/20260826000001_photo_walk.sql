-- ============================================================================
-- PHOTOWALKS IN PUNE — 0015 · WHICH WALK A PHOTOGRAPH CAME FROM
-- ----------------------------------------------------------------------------
-- Photographs carried a caption, a place and a date, but not the one thing
-- this community actually organises around: the walk they were made on. So the
-- archive could not answer "show me the morning at Mandai", and a walk page had
-- nothing to put under it.
--
-- `event_id` is a text key into data/events.ts, exactly as walk_rsvps does it
-- and for the same reason — walks live in that file, not in a table, so there
-- is nothing here to reference. It stays nullable: every photograph already in
-- the archive predates this column, and none of them can be assigned a walk
-- without asking the person who made it.
--
-- Nothing is copied. One row, one file in storage; the walk page and the
-- archive read the same row, so a photograph shown in two places is still one
-- photograph on disk.
-- ============================================================================

alter table public.photos
  add column if not exists event_id text;

comment on column public.photos.event_id is
  'The walk this was shot on — a key into data/events.ts. Null for anything filed before the walk was asked for.';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'photos_event_id_length'
  ) then
    alter table public.photos
      add constraint photos_event_id_length
        check (event_id is null or char_length(event_id) between 1 and 64);
  end if;
end
$$;

-- "Every photograph from this walk, newest first" — the walk page's only query.
create index if not exists photos_event_idx
  on public.photos (event_id, created_at desc)
  where event_id is not null;

-- ---------------------------------------------------------------------------
-- GRANT
-- ---------------------------------------------------------------------------
-- UPDATE on this table is granted column by column (migration 0003), so a new
-- column is not writable until it is named here. Without this a member could
-- file a photograph under a walk on the way in and never correct it.
-- INSERT is granted table-wide, so that half already works.
--
-- The policies are unchanged and still do the real work: a member may only
-- touch rows where profile_id = auth.uid().

grant update (caption, location, taken_at, event_id) on public.photos to authenticated;
