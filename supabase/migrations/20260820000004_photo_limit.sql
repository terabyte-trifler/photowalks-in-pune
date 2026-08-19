-- ============================================================================
-- PHOTOWALKS IN PUNE — 0004 · TWENTY FRAMES EACH
-- ----------------------------------------------------------------------------
-- A ceiling on how many photographs one member can hold.
--
-- This cannot be a CHECK constraint: a check sees one row, and this question
-- is about how many rows already exist for the same profile. It has to be a
-- trigger, and it has to be in the database rather than in the uploader —
-- the browser is not where a limit is enforced, it is only where it is
-- explained politely before somebody wastes an upload on it.
--
-- SECURITY DEFINER so the count is of *every* row for that profile, not only
-- the rows the caller is allowed to see. The select policy on photos happens
-- to be public today, so it would read the same either way; that is a fact
-- about today's policy and not something to rely on.
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

comment on function public.enforce_photo_limit() is
  'Caps a member at 20 photographs. Keep the number in step with MAX_PHOTOS_PER_MEMBER in lib/directory.ts.';

drop trigger if exists photos_enforce_limit on public.photos;
create trigger photos_enforce_limit
  before insert on public.photos
  for each row execute function public.enforce_photo_limit();
