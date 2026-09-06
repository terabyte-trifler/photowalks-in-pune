-- ============================================================================
-- PHOTOWALKS IN PUNE — 0019 · A VACATED USERNAME IS NOT A FREE ONE
-- ----------------------------------------------------------------------------
-- /photographers/<username> is this site's identity primitive: it is what
-- ShareProfile produces, what members paste into Instagram bios, and what
-- search engines index. Until now a member could change username freely and
-- without limit, and the handle they left behind was claimable by anyone the
-- moment they left it.
--
-- That is impersonation with no compromise required. Rename yourself, wait for
-- somebody to take the handle every existing link still points at, and every
-- bookmark, share and search result for the old address now resolves to them.
--
-- Three defences, all in the database, because the button that changes a
-- username is not the only way to change one — PostgREST accepts an UPDATE
-- from any signed-in member, and migration 0014 exists because this project
-- already learned that lesson about the cutoff.
--
--   1. RETIREMENT   a released username goes to username_history and is not
--                   re-issued to anybody else. The person who released it can
--                   still take it back.
--   2. COOLDOWN     one change per 30 days, so handles cannot be cycled to
--                   shed a reputation or to farm names.
--   3. RESERVED     a list of names that are nobody's to hold.
--
-- WHY A DEDICATED TIMESTAMP AND NOT updated_at
-- The obvious implementation compares against profiles.updated_at, and it is
-- wrong here: profiles_touch_updated_at fires on every update to the row, so
-- editing a bio would reset the cooldown and a member could rename daily by
-- changing something harmless in between. username_changed_at only moves when
-- the username does.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1 · The names nobody may hold
-- ---------------------------------------------------------------------------
-- A table rather than a CHECK, because this list will grow and growing it
-- should not require a migration. Every route segment under /photographers'
-- sibling paths is here: a member called `settings` would not break routing —
-- Next resolves /settings before /photographers/settings — but every link to
-- them reads like a link to the site's own furniture.
create table if not exists public.reserved_usernames (
  username text primary key,
  reason   text not null default 'reserved',
  constraint reserved_usernames_lowercase check (username = lower(username))
);

alter table public.reserved_usernames enable row level security;
revoke all on public.reserved_usernames from anon, authenticated;

insert into public.reserved_usernames (username, reason) values
  ('admin', 'impersonates the site'), ('administrator', 'impersonates the site'),
  ('root', 'impersonates the site'), ('official', 'impersonates the site'),
  ('staff', 'impersonates the site'), ('team', 'impersonates the site'),
  ('moderator', 'impersonates the site'), ('mod', 'impersonates the site'),
  ('support', 'impersonates the site'), ('help', 'impersonates the site'),
  ('security', 'impersonates the site'), ('billing', 'impersonates the site'),
  ('photowalks', 'the site itself'), ('photowalksinpune', 'the site itself'),
  ('pwip', 'the site itself'), ('hello', 'the site''s own address'),
  ('login', 'a route'), ('signup', 'a route'), ('settings', 'a route'),
  ('profile', 'a route'), ('photographers', 'a route'), ('walks', 'a route'),
  ('privacy', 'a route'), ('terms', 'a route'), ('auth', 'a route'),
  ('api', 'a route'), ('about', 'a route'), ('contact', 'a route')
on conflict (username) do nothing;

-- ---------------------------------------------------------------------------
-- 2 · Where released names go
-- ---------------------------------------------------------------------------
-- Kept forever. The storage is a few bytes per rename and the alternative is
-- deciding how long an impersonation window is acceptable, which is not a
-- question with a good answer.
create table if not exists public.username_history (
  username     text primary key,
  profile_id   uuid not null references public.profiles(id) on delete cascade,
  released_at  timestamptz not null default now()
);

create index if not exists username_history_profile_idx
  on public.username_history (profile_id);

alter table public.username_history enable row level security;
revoke all on public.username_history from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3 · When this profile last changed its username
-- ---------------------------------------------------------------------------
alter table public.profiles
  add column if not exists username_changed_at timestamptz;

comment on column public.profiles.username_changed_at is
  'Moves only when username changes. Not updated_at, which every profile write touches.';

-- ---------------------------------------------------------------------------
-- 4 · One question, asked in two places
-- ---------------------------------------------------------------------------
-- Both the signup-time generator and the rename trigger need "may this profile
-- take this name", and they must agree — a generator that mints a name the
-- trigger would refuse produces an account that cannot edit its own profile.
create or replace function public.username_available(p_username text, p_profile uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select not exists (select 1 from public.profiles
                      where username = p_username
                        and (p_profile is null or id <> p_profile))
     and not exists (select 1 from public.reserved_usernames
                      where username = p_username)
     and not exists (select 1 from public.username_history
                      where username = p_username
                        and (p_profile is null or profile_id <> p_profile));
$$;

revoke all on function public.username_available(text, uuid) from public, anon, authenticated;
grant execute on function public.username_available(text, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 5 · The generator must not mint what the trigger would refuse
-- ---------------------------------------------------------------------------
-- Only the availability test changes; the candidate ladder is untouched. A new
-- member whose name slugifies to `admin` now gets `admin1`, exactly as one
-- colliding with an existing member always did.
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

  v_base := case
    when char_length(v_first) >= 3 then v_first
    when char_length(v_whole) >= 3 then v_whole
    else public.slugify_username(split_part(coalesce(p_email, ''), '@', 1))
  end;

  if char_length(coalesce(v_base, '')) < 3 then
    v_base := 'photographer';
  end if;

  if p_attempt = 0 then
    v_candidate := v_base;
  elsif p_attempt = 1 and char_length(v_whole) >= 3 and v_whole <> v_base then
    v_candidate := v_whole;
  else
    v_suffix := case
      when p_attempt <= 50 then greatest(p_attempt - 1, 1)
      else 1000 + floor(random() * 899000)::integer
    end;
    v_candidate := left(v_base, 30 - char_length(v_suffix::text)) || v_suffix::text;
  end if;

  if p_attempt < 60 and not public.username_available(v_candidate, null) then
    return public.generate_username(p_full_name, p_email, p_attempt + 1);
  end if;

  return v_candidate;
end;
$$;

revoke all on function public.generate_username(text, text, integer) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6 · The rename itself
-- ---------------------------------------------------------------------------
create or replace function public.profiles_guard_username()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason text;
begin
  if new.username is not distinct from old.username then
    return new;
  end if;

  -- Cooldown. NULL means this profile has never renamed, so the first one is
  -- always allowed.
  if old.username_changed_at is not null
     and old.username_changed_at > now() - interval '30 days' then
    raise exception 'You can change your username once every 30 days. Next change available %',
      to_char(old.username_changed_at + interval '30 days', 'DD Mon YYYY')
      using errcode = 'check_violation';
  end if;

  select reason into v_reason from public.reserved_usernames where username = new.username;
  if found then
    raise exception 'That username is reserved (%).', v_reason
      using errcode = 'check_violation';
  end if;

  if exists (select 1 from public.username_history
              where username = new.username and profile_id <> new.id) then
    raise exception 'That username belonged to another member and is retired.'
      using errcode = 'check_violation';
  end if;

  -- Retire the outgoing name. on conflict, because a member reclaiming their
  -- own old handle will already have a row for it.
  insert into public.username_history (username, profile_id)
  values (old.username, old.id)
  on conflict (username) do update set released_at = now();

  -- And clear the incoming one from history if it is this member's own.
  delete from public.username_history where username = new.username and profile_id = new.id;

  new.username_changed_at := now();
  return new;
end;
$$;

revoke all on function public.profiles_guard_username() from public, anon, authenticated;

drop trigger if exists profiles_guard_username on public.profiles;
create trigger profiles_guard_username
  before update of username on public.profiles
  for each row execute function public.profiles_guard_username();
