-- ============================================================================
-- PHOTOWALKS IN PUNE — 0028 · A CEILING ON MEMBERS, SET BY US
-- ----------------------------------------------------------------------------
-- Google's OAuth page shows a "100 user cap" that cannot be changed, reset, or
-- chosen. It also does not apply here: it governs unapproved sensitive or
-- restricted scopes, and this app asks for `email profile`, which are neither.
-- So the number on that page is not a limit anybody here can use or rely on.
--
-- This is a limit we can. One row, one integer, changed with an UPDATE rather
-- than a migration, and enforced where an account is actually made.
--
-- WHY THE TRIGGER IS ON auth.users AND NOT ON profiles
-- A profile is created by handle_new_user, an AFTER INSERT trigger on
-- auth.users (migration 0001). Refusing the profile would fail the auth insert
-- anyway, in the same transaction, after the account row had been written —
-- and the person would be left with an auth user and no profile if anything
-- ever changed about that ordering. Refusing BEFORE the auth row exists is the
-- only place where "no" leaves nothing behind.
--
-- WHY THE COUNT IS NOT LOCKED
-- Two signups landing in the same instant can both pass a cap of 500 and make
-- it 501. That is the same trade migration 0004 made for the photo limit, and
-- for the same reason: this is a safety valve against something running away,
-- not an allocation of scarce seats. A cap that is occasionally one over is
-- fine; a serialisable lock on every signup is not.
--
-- WHAT SOMEBODY SEES
-- The raise is a last line, not the intended path. /signup asks joining_open()
-- first and says plainly that joining is closed, because an account that
-- cannot be made should be refused by a sentence rather than by a database
-- error. This is the same division registrationClosed already uses for walks:
-- the app stops the button being offered, the database stops the row being
-- written.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1 · THE NUMBER
-- ---------------------------------------------------------------------------

create table if not exists public.site_limits (
  key        text        primary key,
  value      integer     not null check (value >= 0),
  note       text        not null default '',
  updated_at timestamptz not null default now(),

  constraint site_limits_note_length check (char_length(note) <= 200)
);

comment on table public.site_limits is
  'Numbers the site enforces and somebody may want to change without a deploy. No write policy: changed from the SQL editor or by the service role.';

-- Same posture as walk_admins: RLS on, no policies at all, so neither anon nor
-- authenticated can read or write it. The only readers are the two security
-- definer functions below, which are not subject to policies.
alter table public.site_limits enable row level security;
revoke all on public.site_limits from anon, authenticated;

-- 500 against 24 members today. High enough that nobody is turned away in the
-- ordinary course of things, low enough to stop a runaway — which is what this
-- was asked for. Change it with:
--   update public.site_limits set value = 1000, updated_at = now() where key = 'members';
insert into public.site_limits (key, value, note)
values ('members', 500, 'Ceiling on accounts. Delete this row to remove the cap entirely.')
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- 2 · THE GUARD
-- ---------------------------------------------------------------------------
-- security definer because GoTrue inserts as supabase_auth_admin, which has no
-- reason to be granted a read on public.site_limits.
--
-- A missing row means no cap. That is deliberate: deleting the row is how you
-- turn this off, and a limit that fails closed when its own configuration
-- disappears would lock everybody out over a tidy-up.

create or replace function public.enforce_member_cap()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_cap   integer;
  v_count bigint;
begin
  select value into v_cap from public.site_limits where key = 'members';
  if v_cap is null then
    return new;
  end if;

  select count(*) into v_count from auth.users;

  if v_count >= v_cap then
    raise exception 'member_cap_reached: % accounts is the limit', v_cap
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

comment on function public.enforce_member_cap() is
  'Refuses a new account once site_limits.members is reached. Fires before the auth row exists, so a refusal leaves nothing behind.';

drop trigger if exists auth_users_enforce_member_cap on auth.users;
create trigger auth_users_enforce_member_cap
  before insert on auth.users
  for each row execute function public.enforce_member_cap();

-- ---------------------------------------------------------------------------
-- 3 · THE QUESTION THE SIGNUP PAGE ASKS
-- ---------------------------------------------------------------------------
-- Returns a boolean and nothing else — not the cap, not the count. Both are
-- facts about the size of the membership, and a signed-out visitor asking
-- whether they may join does not need either.
--
-- anon may execute it: the page that needs the answer is one nobody has an
-- account for yet.

create or replace function public.joining_open()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select count(*) from auth.users) < (select value from public.site_limits where key = 'members'),
    true
  );
$$;

comment on function public.joining_open() is
  'Whether a new account may be created. True when no cap is configured.';

revoke execute on function public.joining_open() from public;
grant execute on function public.joining_open() to anon, authenticated;
