-- ============================================================================
-- PHOTOWALKS IN PUNE — 0008 · THE VIEWS WERE A WAY ROUND ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
-- Found by an audit, and it was as bad as it gets: an anonymous request, with
-- nothing but the publishable anon key that ships in every browser bundle,
-- could delete every profile in the database.
--
--   DELETE /rest/v1/photographer_cards?...   ->  204, rows gone from profiles
--   DELETE /rest/v1/walk_rsvps?...           ->  401, permission denied
--
-- Same role, same filter. The difference is the view.
--
-- WHY IT HAPPENED
-- Both views are `security_invoker = false`, deliberately: walk_attendance has
-- to show that somebody walked a walk even though RLS on walk_rsvps hides
-- everybody's rows but your own, and photographer_cards has to count those
-- rows for the directory. A security-definer view runs as its owner, postgres,
-- which is exempt from RLS. That is the intended trade, and it means RLS
-- protects nothing behind these two views — the GRANT is the only gate.
--
-- And the GRANT was open. A hosted Supabase project carries
--   alter default privileges in schema public grant all on tables to anon
-- which covers views as well as tables, so both views were born with ALL
-- privileges already granted. Migration 0002 learned this lesson for tables
-- and revoked first; the views in 0003 only ever added `grant select`, which
-- on top of an existing ALL is a no-op. The comment warning about this trap is
-- four lines above the code that fell into it.
--
-- WHAT AN ATTACKER COULD DO BEFORE THIS MIGRATION
--   delete every row in profiles, cascading to photos and walk_rsvps
--   delete every RSVP through walk_attendance
--   rewrite any member's name, bio, username, city, website, instagram
-- all unauthenticated.
--
-- TWO FIXES, BECAUSE ONE OF THEM ALREADY FAILED ONCE
-- 1. Take the privileges away, revoking before granting this time.
-- 2. Make the views structurally incapable of being written through, so that
--    if a default privilege ever hands out ALL again the answer is still no.
--    A view is only auto-updatable when its FROM is a plain table; wrapping
--    the source in a subquery makes it read-only at the rewriter, long before
--    privileges are consulted. The planner flattens the subquery, so this
--    costs nothing at runtime.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1 · STRUCTURALLY READ-ONLY
-- ---------------------------------------------------------------------------
create or replace view public.photographer_cards
  with (security_invoker = false) as
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
  from (select * from public.profiles) p;

comment on view public.photographer_cards is
  'Public profile columns plus walk and photograph counts, for the directory. Read-only by construction: the subquery in FROM makes it non-auto-updatable, so no privilege can turn it into a way to write to profiles.';

create or replace view public.walk_attendance
  with (security_invoker = false) as
  select
    r.profile_id,
    r.event_id,
    r.event_title,
    r.event_date
  from (select * from public.walk_rsvps) r;

comment on view public.walk_attendance is
  'Public projection of walk_rsvps: attendance only, never contact details. Read-only by construction — see photographer_cards.';

-- ---------------------------------------------------------------------------
-- 2 · REVOKE FIRST, THEN GRANT ONLY SELECT
-- ---------------------------------------------------------------------------
revoke all on public.photographer_cards from anon, authenticated;
revoke all on public.walk_attendance    from anon, authenticated;

grant select on public.photographer_cards to anon, authenticated;
grant select on public.walk_attendance    to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3 · THE SECURITY DEFINER HELPERS ARE NOT PUBLIC API
-- ---------------------------------------------------------------------------
-- Every function in `public` is exposed as an RPC endpoint, and these arrived
-- with `grant all ... to anon` from the same default privilege. create_profile_
-- for_user is SECURITY DEFINER: anonymous callers could reach it at
-- /rest/v1/rpc/create_profile_for_user. It refuses to overwrite an existing
-- profile and the foreign key to auth.users stops it minting rows for invented
-- ids, so the damage was bounded — but it is a signup internal and nobody
-- outside the trigger has any business calling it.
--
-- Trigger functions are revoked too. Postgres checks EXECUTE when the trigger
-- is created, not each time it fires, and these fire as their definer, so the
-- signup and updated_at triggers are unaffected.
revoke all on function public.create_profile_for_user(uuid, text, jsonb) from anon, authenticated;
revoke all on function public.generate_username(text, text, integer)     from anon, authenticated;
revoke all on function public.slugify_username(text)                     from anon, authenticated;
revoke all on function public.handle_new_user()                          from anon, authenticated;
revoke all on function public.profiles_touch_updated_at()                from anon, authenticated;
revoke all on function public.enforce_photo_limit()                      from anon, authenticated;
revoke all on function public.purge_user_storage()                       from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4 · STOP THE TRAP RESETTING ITSELF
-- ---------------------------------------------------------------------------
-- The root cause is a default privilege, so the root fix is to change it. From
-- here, anything created in `public` by a migration arrives with no privileges
-- for anon or authenticated, and has to say out loud what it wants to expose.
-- A forgotten grant now fails closed and loudly, in the direction we want.
alter default privileges in schema public revoke all on tables    from anon, authenticated;
alter default privileges in schema public revoke all on functions from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;
