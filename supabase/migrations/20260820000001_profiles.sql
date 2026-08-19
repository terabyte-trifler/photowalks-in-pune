-- ============================================================================
-- PHOTOWALKS IN PUNE — 0001 · PROFILES
-- ----------------------------------------------------------------------------
-- Run this once against your Supabase project (SQL Editor → New query → Run,
-- or `supabase db push` if you use the CLI). It is safe to re-run: every
-- object is created with IF NOT EXISTS or replaced.
--
-- WHAT THIS SETS UP
--   * public.profiles, one row per auth.users row, created by a trigger
--   * a username minted from the person's name, unique at the database level
--   * Row Level Security: anyone may read a profile, only its owner may write
--
-- WHERE PASSWORDS LIVE
--   Nowhere in here. Supabase Auth owns auth.users and the encrypted
--   credentials in it. This schema stores public profile information only, so
--   the "profiles are readable by everyone" policy below cannot leak anything
--   private. Do not add an email, phone or token column to this table.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1 · TABLE
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id                     uuid primary key references auth.users (id) on delete cascade,
  full_name              text        not null,
  username               text        not null unique,
  avatar_url             text,
  bio                    text,
  city                   text        not null default 'Pune',
  instagram_username     text,
  photography_interests  text[],
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  -- Constraints mirror lib/auth/validation.ts. The client checks are a
  -- courtesy; these are the guarantee.
  constraint profiles_username_format
    check (username ~ '^[a-z0-9_]{3,30}$'),
  constraint profiles_full_name_length
    check (char_length(full_name) between 2 and 80),
  constraint profiles_bio_length
    check (bio is null or char_length(bio) <= 280),
  constraint profiles_city_length
    check (char_length(city) between 1 and 60),
  constraint profiles_instagram_format
    check (instagram_username is null
           or instagram_username ~ '^[A-Za-z0-9._]{1,30}$'),
  constraint profiles_avatar_url_scheme
    check (avatar_url is null or avatar_url ~ '^https://'),
  constraint profiles_interests_size
    check (photography_interests is null
           or array_length(photography_interests, 1) <= 8)
);

comment on table public.profiles is
  'Public profile for each authenticated member. Never store credentials or private contact details here.';

-- Usernames are stored lowercase (the format constraint enforces it), so the
-- unique constraint is already case-insensitive by construction.
create index if not exists profiles_created_at_idx
  on public.profiles (created_at desc);

-- Future tables — walk_rsvps, photos, group_members, challenge_submissions —
-- should reference public.profiles (id) on delete cascade. This index keeps
-- those joins cheap before they exist.
create index if not exists profiles_username_lookup_idx
  on public.profiles (username text_pattern_ops);

-- ---------------------------------------------------------------------------
-- 2 · UPDATED_AT
-- ---------------------------------------------------------------------------

-- Named for the table it serves. A bare `touch_updated_at()` is the obvious
-- name and therefore the one another application in the same project is
-- likely to have already — and `create or replace` would silently overwrite
-- theirs. Namespace anything that lands in a shared `public` schema.
create or replace function public.profiles_touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.profiles_touch_updated_at();

-- ---------------------------------------------------------------------------
-- 3 · USERNAME GENERATION
-- ---------------------------------------------------------------------------
-- "Gurnoor Singh" becomes gurnoor; if that is taken, gurnoorsingh; if that is
-- taken too, gurnoor1, gurnoor2 and so on. A name with nothing usable in it
-- (scripts we cannot transliterate, a one-character name) falls back to the
-- email local part and finally to "photographer".
--
-- This is only the candidate generator. Uniqueness is guaranteed by the unique
-- constraint plus the retry loop in handle_new_user, not by the lookup here —
-- two signups in the same millisecond would otherwise both see a free name.

create or replace function public.slugify_username(p_value text)
returns text
language sql
immutable
set search_path = ''
as $$
  -- Accented Latin letters fold to their base letter first, so Zoë becomes
  -- "zoe" rather than "zo". Anything outside this alphabet — Devanagari, for
  -- instance — is dropped and generate_username falls back, rather than
  -- mangling the name into something unreadable. The person's actual name is
  -- never altered; this only produces the URL handle.
  select left(
    regexp_replace(
      translate(
        lower(coalesce(p_value, '')),
        'àáâãäåāăąèéêëēĕėęěìíîïĩīĭįıòóôõöøōŏőùúûüũūŭůűųçćĉċčñńņňšśşÿýŷžźżđďğłťř',
        'aaaaaaaaaeeeeeeeeeiiiiiiiiiooooooooouuuuuuuuuucccccnnnnsssyyyzzzddgltr'
      ),
      '[^a-z0-9]+', '', 'g'
    ),
    30
  );
$$;

create or replace function public.generate_username(
  p_full_name text,
  p_email     text default null,
  p_attempt   integer default 0
)
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_first    text;
  v_whole    text;
  v_base     text;
  v_candidate text;
  v_suffix   integer;
begin
  v_first := public.slugify_username(split_part(trim(coalesce(p_full_name, '')), ' ', 1));
  v_whole := public.slugify_username(p_full_name);

  -- A usable base, in order of preference.
  v_base := case
    when char_length(v_first) >= 3 then v_first
    when char_length(v_whole) >= 3 then v_whole
    else public.slugify_username(split_part(coalesce(p_email, ''), '@', 1))
  end;

  if char_length(coalesce(v_base, '')) < 3 then
    v_base := 'photographer';
  end if;

  -- Attempt 0: the base itself. Attempt 1: the whole name, when it differs.
  if p_attempt = 0 then
    v_candidate := v_base;
  elsif p_attempt = 1 and char_length(v_whole) >= 3 and v_whole <> v_base then
    v_candidate := v_whole;
  else
    -- gurnoor1, gurnoor2, ... then a random tail once the polite range is gone.
    v_suffix := case
      when p_attempt <= 50 then greatest(p_attempt - 1, 1)
      else 1000 + floor(random() * 899000)::integer
    end;
    v_candidate := left(v_base, 30 - char_length(v_suffix::text)) || v_suffix::text;
  end if;

  -- Skip candidates that are already taken so the common case resolves on the
  -- first pass; the caller still handles the race.
  if p_attempt < 60 and exists (
    select 1 from public.profiles where username = v_candidate
  ) then
    return public.generate_username(p_full_name, p_email, p_attempt + 1);
  end if;

  return v_candidate;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4 · PROFILE CREATION
-- ---------------------------------------------------------------------------
-- ONE source of truth. The trigger below is the only thing that creates a
-- profile row — the application never inserts one. Doing both is how you end
-- up with duplicates and with Google sign-ups that have no profile at all,
-- because an OAuth callback has no signup form to run code in.
--
-- SECURITY DEFINER because it writes public.profiles while running as the
-- auth machinery, and `set search_path = ''` so a schema on the caller's path
-- cannot shadow the functions it calls.

-- The profile write itself, shared by the trigger and by the backfill below,
-- so there is one definition of what a profile starts out as.
create or replace function public.create_profile_for_user(
  p_id    uuid,
  p_email text,
  p_meta  jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_full_name text;
  v_avatar    text;
  v_username  text;
  v_attempt   integer := 0;
begin
  -- Email signup sends full_name. Google sends full_name and name; some
  -- providers only send one of them.
  v_full_name := coalesce(
    nullif(trim(p_meta ->> 'full_name'), ''),
    nullif(trim(p_meta ->> 'name'), ''),
    nullif(split_part(coalesce(p_email, ''), '@', 1), ''),
    'Photographer'
  );
  v_full_name := left(regexp_replace(v_full_name, '\s+', ' ', 'g'), 80);

  -- The full_name check constraint wants at least two characters, and a
  -- signup must never fail on the shape of a name. A blank name with the
  -- address x@example.com would otherwise land here as "x"; Google can also
  -- return a single-character name.
  if char_length(v_full_name) < 2 then
    v_full_name := 'Photographer';
  end if;

  v_avatar := coalesce(
    nullif(p_meta ->> 'avatar_url', ''),
    nullif(p_meta ->> 'picture', '')
  );
  if v_avatar is not null and v_avatar !~ '^https://' then
    v_avatar := null;
  end if;

  -- Retry on the unique constraint: two people called Gurnoor signing up at
  -- the same instant both see "gurnoor" as free.
  loop
    v_username := public.generate_username(v_full_name, p_email, v_attempt);
    begin
      insert into public.profiles (id, full_name, username, avatar_url, city)
      values (p_id, v_full_name, v_username, v_avatar, 'Pune');
      exit;
    exception
      when unique_violation then
        -- Either the username is taken, or this user already has a profile.
        if exists (select 1 from public.profiles where id = p_id) then
          exit;
        end if;
        v_attempt := v_attempt + 1;
        if v_attempt > 12 then
          -- Never block a signup over a name collision.
          insert into public.profiles (id, full_name, username, avatar_url, city)
          values (p_id, v_full_name,
                  'photographer' || left(replace(p_id::text, '-', ''), 12),
                  v_avatar, 'Pune');
          exit;
        end if;
    end;
  end loop;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.create_profile_for_user(
    new.id, new.email, coalesce(new.raw_user_meta_data, '{}'::jsonb)
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 4b · BACKFILL
-- ---------------------------------------------------------------------------
-- The trigger only fires for new rows, so anybody who signed up before this
-- migration ran would have an account and no profile — invisible on the site,
-- and a 404 on their own /profile. Give them one. Safe to re-run: it only
-- looks at auth users with no profile row.

do $$
declare
  r record;
begin
  for r in
    select u.id, u.email, coalesce(u.raw_user_meta_data, '{}'::jsonb) as meta
    from auth.users u
    left join public.profiles p on p.id = u.id
    where p.id is null
  loop
    perform public.create_profile_for_user(r.id, r.email, r.meta);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5 · ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
-- Read: everyone, signed in or not. Public profiles are the point of a
-- photography community, and this table holds nothing private.
-- Write: yourself, only. auth.uid() is the JWT subject, so a client cannot
-- forge it by sending a different id in the request body.

alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by everyone"   on public.profiles;
drop policy if exists "Users can create their own profile"  on public.profiles;
drop policy if exists "Users can update their own profile"  on public.profiles;

create policy "Profiles are viewable by everyone"
  on public.profiles
  for select
  to anon, authenticated
  using (true);

create policy "Users can create their own profile"
  on public.profiles
  for insert
  to authenticated
  with check (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Deliberately no delete policy: profiles disappear when the auth user is
-- deleted, through the cascade on the foreign key.

-- ---------------------------------------------------------------------------
-- 6 · GRANTS
-- ---------------------------------------------------------------------------
-- RLS is the gate; these grants only say which verbs are on the table at all.

grant usage on schema public to anon, authenticated;

-- Start from nothing. A hosted Supabase project ships with
--   alter default privileges in schema public grant all on tables to anon, authenticated
-- so a newly created table arrives with INSERT, UPDATE and DELETE already
-- granted to both roles — which silently undoes the narrow column grant below
-- and leaves anon holding UPDATE with only RLS in the way. The local CLI stack
-- does not do this, so the difference is invisible until you deploy. Revoking
-- first makes the outcome the same everywhere.
revoke all on public.profiles from anon, authenticated;

grant select on public.profiles to anon, authenticated;
grant insert on public.profiles to authenticated;

-- UPDATE is granted per column, not on the table. Identity and timestamps are
-- simply absent from this list, so they cannot be rewritten by their owner —
-- id is what every future table (walk_rsvps, photos, challenge_submissions)
-- will point at, and a member reassigning it would take their history with it.
--
-- It has to be a narrow GRANT rather than a broad grant followed by a REVOKE:
-- Postgres will not subtract individual columns from a table-wide UPDATE, so
-- `grant update on profiles` + `revoke update (id)` leaves id writable.
--
-- updated_at is not in the list either; the touch_updated_at trigger sets it,
-- and a trigger's assignment is not subject to column privileges.
grant update (
  full_name,
  username,
  avatar_url,
  bio,
  city,
  instagram_username,
  photography_interests
) on public.profiles to authenticated;
