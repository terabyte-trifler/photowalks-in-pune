-- ============================================================================
-- PHOTOWALKS IN PUNE — 0022 · THE PHOTO LIMIT HAD THE SAME RACE AS CAPACITY
-- ----------------------------------------------------------------------------
-- 0021 fixed walk capacity by taking a row lock before counting, because N
-- simultaneous inserts otherwise each read the same count(), each see room, and
-- each succeed. enforce_photo_limit (0004) has the identical shape and was
-- written before that was understood:
--
--   select count(*) into v_count from public.photos where profile_id = …;
--   if v_count >= 20 then raise …
--
-- Nothing serialises those, so a member uploading several photographs at once —
-- which the upload form permits, and which a browser will happily do in
-- parallel — can land more than twenty. The stakes are much smaller than a
-- stranger taking a place on a full walk: the prize is an extra photograph. It
-- is fixed because it is the same bug, and leaving a known instance of a bug
-- you just fixed elsewhere is how it comes back.
--
-- THE LOCK IS ON profiles, NOT photos
-- The same reasoning as 0021: you cannot lock rows that do not exist yet. The
-- owner's profile row is the thing every one of these inserts has in common, so
-- locking it is what makes them queue. It is held for the length of the insert
-- only, and it is per member, so two people uploading at the same time do not
-- wait for each other.
--
-- Everything else is unchanged, deliberately: the limit is still 20, the
-- errcode is still P0001, and the message still begins `photo_limit_reached`,
-- which lib/uploads.ts:629 matches to say something human. A migration that
-- fixes a race should not also quietly change what the user reads.
-- ============================================================================

create or replace function public.enforce_photo_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
  v_limit constant integer := 20;
begin
  -- Serialise concurrent inserts for this member. The row is guaranteed to
  -- exist: photos.profile_id references it.
  perform 1 from public.profiles where id = new.profile_id for update;

  select count(*) into v_count
  from public.photos
  where profile_id = new.profile_id;

  if v_count >= v_limit then
    -- The message is matched in lib/uploads.ts to say something human.
    raise exception 'photo_limit_reached: % photographs is the limit', v_limit
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function public.enforce_photo_limit() from public, anon, authenticated;
