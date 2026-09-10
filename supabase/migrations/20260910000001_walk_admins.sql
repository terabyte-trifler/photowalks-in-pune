-- ============================================================================
-- PHOTOWALKS IN PUNE — 0026 · WHO IS COMING, FOR THE PEOPLE RUNNING THE WALK
-- ----------------------------------------------------------------------------
-- Migration 0002 made an RSVP private and meant it: a row carries a phone
-- number, members read only their own, and anon reads nothing. That is still
-- right. It also left the organiser with no way to see who is coming to a walk
-- they are about to lead — the index `walk_rsvps_event_idx` was created for
-- "the organiser's list" and nothing has ever been able to run that query.
--
-- So this adds the smallest thing that closes the gap: a named list of admins,
-- and one more SELECT policy for them. Nothing else changes. Members keep
-- reading their own rows, anon keeps reading nothing, and no service-role key
-- enters the codebase — the invariant lib/rsvp.ts states in its header.
--
-- WHY A TABLE AND NOT A COLUMN ON profiles
-- Because members can update their own profile row. A boolean there would be a
-- privilege a member could grant themselves, and the first person to open the
-- network tab would be an admin. A separate table with no write policy at all
-- can only be changed from the SQL editor or by the service role, which is the
-- correct amount of ceremony for handing somebody every attendee's phone
-- number.
--
-- WHAT AN ADMIN CAN SEE, AND WHAT THEY STILL CANNOT
-- Every walk_rsvps row: name, walk, phone number, experience, when they signed
-- up. That is the point of the page. They gain nothing else — no write
-- policy, no access to another member's photographs, no delete. Reading an
-- attendee list is the whole grant.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1 · THE LIST
-- ---------------------------------------------------------------------------

create table if not exists public.walk_admins (
  profile_id uuid        primary key references public.profiles (id) on delete cascade,
  -- Why this person, in their own words. A list of bare uuids in a year's time
  -- is a list nobody dares remove anything from.
  note       text        not null default '',
  added_at   timestamptz not null default now(),

  constraint walk_admins_note_length check (char_length(note) <= 200)
);

comment on table public.walk_admins is
  'Members who may read every RSVP. No write policy exists: rows are added from the SQL editor or by the service role, deliberately.';

-- RLS on, and NOT ONE POLICY. That is not an oversight — with RLS enabled and
-- no policy, neither anon nor authenticated can read or write this table at
-- all. The only reader is is_walk_admin() below, which is security definer and
-- therefore not subject to policies.
alter table public.walk_admins enable row level security;

revoke all on public.walk_admins from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2 · THE QUESTION, ASKED SAFELY
-- ---------------------------------------------------------------------------
-- security definer so it can read walk_admins, which nothing else can; stable
-- so the planner may call it once per statement rather than once per row;
-- `set search_path = ''` and fully qualified names so it cannot be redirected
-- by a caller's search_path, per migration 0018.
--
-- It answers only about the caller. There is no parameter, so it cannot be
-- used to ask whether somebody ELSE is an admin — the one shape of this
-- function that would leak something.

create or replace function public.is_walk_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.walk_admins where profile_id = (select auth.uid())
  );
$$;

comment on function public.is_walk_admin() is
  'True when the calling member is in walk_admins. Takes no argument on purpose: it can only answer about the caller.';

revoke execute on function public.is_walk_admin() from public;
grant execute on function public.is_walk_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- 3 · THE POLICY
-- ---------------------------------------------------------------------------
-- Added alongside "Members read their own rsvps", not instead of it. Multiple
-- permissive policies for the same command are OR-ed, so a member still reads
-- their own rows whether or not they are an admin, and an admin reads all of
-- them. Nothing is dropped, so a mistake here cannot take away what already
-- worked.
--
-- SELECT only. An admin has no business editing somebody's RSVP: cancelling is
-- the member's own decision and stays theirs.

drop policy if exists "Admins read every rsvp" on public.walk_rsvps;

create policy "Admins read every rsvp"
  on public.walk_rsvps
  for select
  to authenticated
  using ((select public.is_walk_admin()));

-- ---------------------------------------------------------------------------
-- 4 · THE FIRST ADMIN
-- ---------------------------------------------------------------------------
-- Seeded by username rather than by a pasted uuid, so this line says who it is
-- and stays readable a year from now. `on conflict do nothing` makes the
-- migration safe to run twice; the `where` makes it safe to run against a
-- database where that profile does not exist, which is every fresh local
-- stack — it simply seeds nobody.

insert into public.walk_admins (profile_id, note)
select id, 'site owner'
from public.profiles
where username = 'gurnoorsingh'
on conflict (profile_id) do nothing;
