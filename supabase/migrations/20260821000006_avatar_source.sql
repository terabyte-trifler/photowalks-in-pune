-- ============================================================================
-- PHOTOWALKS IN PUNE — 0007 · AN AVATAR MUST COME FROM SOMEWHERE WE KNOW
-- ----------------------------------------------------------------------------
-- avatar_url only had to start with https, and the real check — that the image
-- lives in this project's own storage — sat in the updateAvatar server action.
-- That guard is skippable: a member can call PostgREST directly and set the
-- column to any address at all.
--
-- It matters because the avatar renders on the public directory and on the
-- profile, and remote URLs are loaded unoptimised, straight from wherever they
-- point. So the column was a way to make every visitor's browser fetch an
-- arbitrary URL — a tracking pixel that logs who is looking, or simply an
-- image nobody wants on the site.
--
-- Two sources are legitimate:
--
--   this project's avatars bucket   what the uploader writes
--   Google's user content host      what handle_new_user copies from an
--                                   OAuth sign-up's `picture` claim
--
-- The pattern is not tied to a project ref, so the same constraint is correct
-- on a fresh project, a branch, or a restored backup — but it *is* tied to the
-- supabase.co host. Matching the path alone is not enough: anybody can serve
-- /storage/v1/object/public/avatars/ from a domain they control, and a check
-- that accepts evil.example because the path looks familiar is decoration
-- rather than a constraint.
-- ============================================================================

alter table public.profiles
  drop constraint if exists profiles_avatar_url_scheme;

alter table public.profiles
  drop constraint if exists profiles_avatar_url_source;

alter table public.profiles
  add constraint profiles_avatar_url_source
  check (
    avatar_url is null
    or avatar_url ~ '^https://[a-z0-9-]+\.supabase\.co/storage/v1/object/public/avatars/[^[:space:]]+$'
    or avatar_url ~ '^https://lh[0-9]+\.googleusercontent\.com/[^[:space:]]+$'
  );

comment on constraint profiles_avatar_url_source on public.profiles is
  'An avatar may only point at this project''s avatars bucket or a Google OAuth picture. Application-level checks are skippable; this is not.';
