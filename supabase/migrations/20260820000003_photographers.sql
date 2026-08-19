-- ============================================================================
-- PHOTOWALKS IN PUNE — 0003 · PHOTOGRAPHERS
-- ----------------------------------------------------------------------------
-- Turns a set of accounts into a directory of photographers: a website field,
-- a photographs table, storage for images, and two curated public views that
-- let a profile page show counts and attendance without exposing anything
-- private.
--
-- Nothing here widens access to an existing column. profiles stays exactly as
-- public as it was; walk_rsvps stays exactly as private as it was.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1 · PROFILES GAINS A WEBSITE
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists website_url text;

alter table public.profiles
  drop constraint if exists profiles_website_url_format;
alter table public.profiles
  add constraint profiles_website_url_format
  check (
    website_url is null
    or (website_url ~ '^https?://[^\s]+\.[^\s]+$' and char_length(website_url) <= 200)
  );

comment on column public.profiles.website_url is
  'A photographer''s own site. Stored with its scheme; rendered as the bare host.';

-- Migration 0002 grants UPDATE per column, so a new column is not writable by
-- its owner until it is named here. This is the cost of the narrow grant, and
-- the reason it is worth remembering when adding columns.
grant update (website_url) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- 2 · PHOTOGRAPHS
-- ---------------------------------------------------------------------------
-- The archive in data/photos.ts stays as it is — those are the site's own
-- curated frames. This table is what members upload to their own profile.
--
-- The image lives in Supabase Storage; only its path is stored here, so the
-- project can move buckets or put a CDN in front without rewriting rows.

create table if not exists public.photos (
  id            uuid        primary key default gen_random_uuid(),
  profile_id    uuid        not null references public.profiles (id) on delete cascade,
  storage_path  text        not null,
  caption       text,
  location      text,
  taken_at      date,
  -- Kept so next/image can reserve the right box before the file arrives.
  width         integer,
  height        integer,
  created_at    timestamptz not null default now(),

  constraint photos_storage_path_length  check (char_length(storage_path) between 1 and 400),
  constraint photos_caption_length       check (caption is null or char_length(caption) <= 280),
  constraint photos_location_length      check (location is null or char_length(location) <= 120),
  constraint photos_dimensions_sane      check (
    (width is null and height is null)
    or (width between 1 and 20000 and height between 1 and 20000)
  ),
  -- The same file cannot be filed twice.
  constraint photos_storage_path_unique  unique (storage_path)
);

comment on table public.photos is
  'Photographs uploaded by members and shown on their profile. Public to read.';

create index if not exists photos_profile_created_idx
  on public.photos (profile_id, created_at desc);

-- Photography is the point of the site, so it is readable by everybody.
-- Writing is limited to the photographer it belongs to.
alter table public.photos enable row level security;

drop policy if exists "Photographs are viewable by everyone" on public.photos;
drop policy if exists "Members add their own photographs"    on public.photos;
drop policy if exists "Members edit their own photographs"   on public.photos;
drop policy if exists "Members delete their own photographs" on public.photos;

create policy "Photographs are viewable by everyone"
  on public.photos for select to anon, authenticated using (true);

create policy "Members add their own photographs"
  on public.photos for insert to authenticated with check (auth.uid() = profile_id);

create policy "Members edit their own photographs"
  on public.photos for update to authenticated
  using (auth.uid() = profile_id) with check (auth.uid() = profile_id);

create policy "Members delete their own photographs"
  on public.photos for delete to authenticated using (auth.uid() = profile_id);

-- Revoke first: a hosted project grants ALL on new public tables to anon and
-- authenticated by default. See the note in migration 0002.
revoke all on public.photos from anon, authenticated;
grant select on public.photos to anon, authenticated;
grant insert, delete on public.photos to authenticated;
grant update (caption, location, taken_at) on public.photos to authenticated;

-- ---------------------------------------------------------------------------
-- 3 · WHO WALKED, WITHOUT WHO THEY ARE REACHABLE ON
-- ---------------------------------------------------------------------------
-- A profile should be able to say "walked Old Pune, New Eyes", and a walk
-- should be able to say who else is coming. walk_rsvps cannot answer either:
-- it is owner-only by design, because it holds a phone number.
--
-- This view is the curated public half of that table — who, which walk, when,
-- and nothing else. It deliberately runs with the privileges of its owner
-- rather than the caller (`security_invoker = false`), which is what lets it
-- see past the row policy on walk_rsvps. That is safe precisely because the
-- column list is fixed here: there is no way to ask this view for a phone
-- number. Do not add columns to it without re-reading this paragraph.

drop view if exists public.walk_attendance;
create view public.walk_attendance
  with (security_invoker = false)
  as
  select
    r.profile_id,
    r.event_id,
    r.event_title,
    r.event_date
  from public.walk_rsvps r;

comment on view public.walk_attendance is
  'Public projection of walk_rsvps: attendance only, never contact details.';

grant select on public.walk_attendance to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4 · THE DIRECTORY
-- ---------------------------------------------------------------------------
-- Everything a photographer card needs, including counts, in one row. Sorting
-- the directory by "most walks attended" is otherwise impossible from the
-- client without reading the whole table.
--
-- Same reasoning as above: a fixed projection of public profile columns plus
-- two integers. No private column appears here.

drop view if exists public.photographer_cards;
create view public.photographer_cards
  with (security_invoker = false)
  as
  select
    p.id,
    p.username,
    p.full_name,
    p.avatar_url,
    p.bio,
    p.city,
    p.instagram_username,
    p.website_url,
    p.photography_interests,
    p.created_at,
    p.updated_at,
    (select count(*) from public.walk_rsvps r where r.profile_id = p.id) as walks_attended,
    (select count(*) from public.photos ph where ph.profile_id = p.id)   as photo_count
  from public.profiles p;

comment on view public.photographer_cards is
  'Public profile columns plus walk and photograph counts, for the directory.';

grant select on public.photographer_cards to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5 · STORAGE
-- ---------------------------------------------------------------------------
-- Two public buckets. Public here means readable — writing is still limited to
-- the owner, by the policies below.
--
-- Every object is filed under the owner's uid as its first path segment:
--
--     avatars/<uid>/<timestamp>.jpg
--     photos/<uid>/<uuid>.jpg
--
-- which is what `(storage.foldername(name))[1] = auth.uid()::text` checks. A
-- member therefore cannot write into, overwrite or delete anything in another
-- member's folder, and the check is made by the database rather than by the
-- upload code.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2097152,  array['image/jpeg','image/png','image/webp','image/avif']),
  ('photos',  'photos',  true, 10485760, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Member images are publicly readable"   on storage.objects;
drop policy if exists "Members upload to their own folder"    on storage.objects;
drop policy if exists "Members replace their own images"      on storage.objects;
drop policy if exists "Members delete their own images"       on storage.objects;

create policy "Member images are publicly readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id in ('avatars', 'photos'));

create policy "Members upload to their own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id in ('avatars', 'photos')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Members replace their own images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id in ('avatars', 'photos')
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id in ('avatars', 'photos')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Members delete their own images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id in ('avatars', 'photos')
    and (storage.foldername(name))[1] = auth.uid()::text
  );
