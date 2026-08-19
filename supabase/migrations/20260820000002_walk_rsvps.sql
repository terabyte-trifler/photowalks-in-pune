-- ============================================================================
-- PHOTOWALKS IN PUNE — 0002 · WALK RSVPS
-- ----------------------------------------------------------------------------
-- Who is coming on which walk. Joining a walk requires an account (see the
-- gate in components/rsvp/RSVPModal.tsx), so every row belongs to a profile
-- rather than to a typed-in name.
--
-- Walks themselves still live in data/events.ts, not in the database — they
-- are edited by hand a few times a month and a table would be ceremony for
-- four rows. `event_id` is therefore a text key into that file rather than a
-- foreign key, and the title and date are copied in so this table can answer
-- "which walks am I on" on its own, and so a past RSVP still reads correctly
-- after a walk is edited or removed from the file.
--
-- When walks do become a table, `event_id` becomes the foreign key and the two
-- copied columns can be dropped.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1 · TABLE
-- ---------------------------------------------------------------------------

create table if not exists public.walk_rsvps (
  id           uuid        primary key default gen_random_uuid(),
  profile_id   uuid        not null references public.profiles (id) on delete cascade,
  event_id     text        not null,
  event_title  text        not null,
  event_date   date        not null,
  whatsapp     text        not null,
  experience   text        not null,
  consent      boolean     not null default false,
  created_at   timestamptz not null default now(),

  -- One place per person per walk. This is what makes a double-tap on "I'm in"
  -- harmless, and what the "you are already on this walk" message keys off.
  constraint walk_rsvps_one_per_walk unique (profile_id, event_id),

  constraint walk_rsvps_event_id_length
    check (char_length(event_id) between 1 and 64),
  constraint walk_rsvps_event_title_length
    check (char_length(event_title) between 1 and 160),
  -- Digits, spaces and the usual punctuation; enough to reject junk without
  -- pretending to validate international numbering plans.
  constraint walk_rsvps_whatsapp_format
    check (whatsapp ~ '^[0-9+()\-. ]{8,20}$'),
  constraint walk_rsvps_experience_valid
    check (experience in ('Beginner', 'Enthusiast', 'Professional', 'Just here to explore'))
);

comment on table public.walk_rsvps is
  'One row per member per walk. Contact details other than the WhatsApp number live on the profile.';

-- "Which walks am I on", newest first — the /my-walks query.
create index if not exists walk_rsvps_profile_date_idx
  on public.walk_rsvps (profile_id, event_date desc);

-- "Who is coming on this walk" — the organiser's list, and the headcount.
create index if not exists walk_rsvps_event_idx
  on public.walk_rsvps (event_id);

-- ---------------------------------------------------------------------------
-- 2 · ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------
-- Unlike profiles, an RSVP is private. It carries a phone number, and who is
-- attending a walk is nobody else's business. Members see only their own rows;
-- anon sees nothing at all.
--
-- Note there is no UPDATE policy. Changing your mind means cancelling and
-- joining again, which keeps created_at honest as "when they signed up".

alter table public.walk_rsvps enable row level security;

drop policy if exists "Members read their own rsvps"   on public.walk_rsvps;
drop policy if exists "Members create their own rsvps" on public.walk_rsvps;
drop policy if exists "Members cancel their own rsvps" on public.walk_rsvps;

create policy "Members read their own rsvps"
  on public.walk_rsvps
  for select
  to authenticated
  using (auth.uid() = profile_id);

create policy "Members create their own rsvps"
  on public.walk_rsvps
  for insert
  to authenticated
  with check (auth.uid() = profile_id);

create policy "Members cancel their own rsvps"
  on public.walk_rsvps
  for delete
  to authenticated
  using (auth.uid() = profile_id);

-- ---------------------------------------------------------------------------
-- 3 · GRANTS
-- ---------------------------------------------------------------------------
-- Revoke first. A hosted Supabase project grants ALL on new public tables to
-- anon and authenticated by default, which would leave anon holding INSERT on
-- this table with only RLS in the way — and would hand authenticated an UPDATE
-- privilege that no policy is written for. The local CLI stack does not do
-- this, so the difference does not show up until deploy.

revoke all on public.walk_rsvps from anon, authenticated;

grant select, insert, delete on public.walk_rsvps to authenticated;

-- anon is granted nothing: signed-out visitors cannot read or write RSVPs.
