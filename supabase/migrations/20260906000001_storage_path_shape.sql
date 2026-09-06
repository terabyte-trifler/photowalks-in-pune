-- ============================================================================
-- PHOTOWALKS IN PUNE — 0016 · A STORAGE PATH MUST BE A PATH, AND THE OWNER'S
-- ----------------------------------------------------------------------------
-- photos.storage_path only had to be between 1 and 400 characters. Anything
-- else fitting in that budget was storable, including a URL — and a URL is
-- exactly what the render path does something dangerous with:
--
--   lib/directory.ts   imageUrl() returned any http(s) string unchanged
--   WorkGrid           handed it straight to <Image src=…>
--   next/image         a hostname outside remotePatterns THROWS during render
--
-- A throw during render is not a broken image. It is HTTP 500 for the whole
-- page. And these photographs are not shown only on their owner's profile:
-- PhotographerCard renders them across the directory, and photos.event_id —
-- also member-writable — decides which walk page a frame appears on. So one
-- row written by one member could return 500 for /photographers, or for a walk
-- that member never attended, until somebody found the row. The symptom names
-- neither the row nor the member.
--
-- The other half is quieter and was the point of migration 0007: a URL on an
-- ALLOWED host loads perfectly well, which makes the column a way to put a
-- third-party tracking pixel on a public profile and log everybody who looks.
--
-- THIS IS 0007'S ARGUMENT, APPLIED WHERE IT WAS MISSED
-- Migration 0007 closed precisely this class for profiles.avatar_url, and said
-- why in a sentence that was already true of this column: "Application-level
-- checks are skippable; this is not." The updateAvatar server action was not
-- the guard, because a member can call PostgREST directly — and neither is
-- PhotoManager, for the same reason. Both of these constraints are.
--
-- WHY TWO CHECKS AND NOT A TRIGGER
-- The first pins the shape. The second pins the owner, and it does it by
-- comparing two columns of the same row rather than by calling auth.uid() in a
-- trigger. That matters for three reasons: a CHECK is declarative and cannot
-- be skipped by a writer that arrives another way; split_part is immutable, so
-- it is legal in a constraint and free to evaluate; and it stays correct for
-- service_role and for any future backfill, where auth.uid() is null and a
-- trigger written against it would either break the write or wave it through.
--
-- Ownership is now stated twice, deliberately. The RLS policy says the ROW is
-- yours; this says the FILE is too. Those were never the same claim, and the
-- gap between them is what this migration closes.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Before: what would fail
-- ---------------------------------------------------------------------------
-- Verified against production before writing this: 118 rows, none violating
-- either constraint, so both validate without touching a single row. Re-run
-- this against any other project before pushing — a restored backup or a
-- branch may hold rows from before the uploader settled on its path shape:
--
--   select id, profile_id, storage_path
--   from public.photos
--   where storage_path !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9._-]{1,120}$'
--      or split_part(storage_path, '/', 1) <> profile_id::text;

-- ---------------------------------------------------------------------------
-- 1 · SHAPE
-- ---------------------------------------------------------------------------
-- `<uuid>/<filename>`, which is what uploadImage() has always produced:
--
--     `${ownerId}/${Date.now()}-${Math.random().toString(36).slice(2,8)}.webp`
--
-- The uuid is spelled out group by group rather than as [0-9a-f-]{36}, because
-- that shorthand also accepts thirty-six hyphens. One slash, and no spaces or
-- control characters in the filename — so a URL cannot be stored here at all,
-- and neither can a path that climbs out of the folder.

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'photos_storage_path_shape'
  ) then
    alter table public.photos
      add constraint photos_storage_path_shape
        check (
          storage_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[A-Za-z0-9._-]{1,120}$'
        );
  end if;
end
$$;

comment on constraint photos_storage_path_shape on public.photos is
  'A storage path is <uuid>/<filename> inside the photos bucket — never a URL. See migration 0007, which makes the same argument for avatar_url.';

-- ---------------------------------------------------------------------------
-- 2 · OWNER
-- ---------------------------------------------------------------------------
-- The folder in the path must be the profile the row belongs to. Without this,
-- a member could file somebody else's file under their own row: the RLS policy
-- would allow it, because the row really is theirs, and the photograph would
-- appear on their profile with their name under it.
--
-- Storage already refuses to let them WRITE into another member's folder
-- (migration 0003). This refuses to let them CLAIM one, which is a different
-- act and was not covered.

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'photos_storage_path_owner'
  ) then
    alter table public.photos
      add constraint photos_storage_path_owner
        check (split_part(storage_path, '/', 1) = profile_id::text);
  end if;
end
$$;

comment on constraint photos_storage_path_owner on public.photos is
  'The folder in storage_path must be the owning profile. RLS says the row is yours; this says the file is.';

-- ---------------------------------------------------------------------------
-- 3 · NOTHING TO GRANT
-- ---------------------------------------------------------------------------
-- storage_path is deliberately absent from the column-level UPDATE grant in
-- migration 0003 — a member may edit a caption, a location, a date and a walk,
-- never the file a row points at. A photograph is replaced by deleting the row
-- and uploading again, which is what PhotoManager does. So these constraints
-- are reached on INSERT only, and that is the whole of the write surface.
