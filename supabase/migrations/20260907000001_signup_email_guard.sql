-- ============================================================================
-- PHOTOWALKS IN PUNE — 0017 · WHAT AN EMAIL ADDRESS HAS TO BE
-- ----------------------------------------------------------------------------
-- Confirming an address proves somebody can open it. It does not prove the
-- address will still exist next week, and a ten-minute inbox passes that test
-- as comfortably as a real one. So signups are now screened before the account
-- exists at all, by the before-user-created auth hook in
-- supabase/functions/signup-guard.
--
-- This migration provides the half that has to live in the database: the list
-- of domains that are not accepted, kept in a table rather than compiled into
-- the function so that refreshing it is a data change, not a deployment.
-- scripts/refresh-disposable-domains.mjs does the refreshing.
--
-- WHY A TABLE AND NOT AN ALLOW-LIST
-- The obvious version of this feature is "only gmail.com". It is worse than it
-- looks. It turns away Outlook, Proton, iCloud and — the expensive one for a
-- photography community — everybody whose address is at their own portfolio
-- domain, which is exactly the membership worth having. And it does not even
-- close the door it aims at: Gmail ignores dots and accepts +suffixes, so one
-- inbox yields unlimited distinct-looking addresses. Blocking the throwaways
-- by name is narrower and hits what was actually aimed at.
--
-- WHO CAN READ IT
-- Nobody, through the API. The list is an anti-abuse control and publishing it
-- hands somebody the exact set of domains that still work. Only the hook needs
-- it, and the hook reaches it with the service-role key.
-- ============================================================================

create table if not exists public.blocked_email_domains (
  domain      text primary key,
  added_at    timestamptz not null default now(),

  -- Where this domain came from, so a false positive can be traced back to the
  -- list that asserted it rather than argued about.
  source      text not null default 'manual',

  constraint blocked_email_domains_lowercase check (domain = lower(domain)),
  constraint blocked_email_domains_shape     check (domain ~ '^[a-z0-9.-]+\.[a-z]{2,}$')
);

comment on table public.blocked_email_domains is
  'Disposable/temporary email domains refused at signup by the before-user-created hook. Refreshed by scripts/refresh-disposable-domains.mjs.';

-- ---------------------------------------------------------------------------
-- Locked down completely.
-- ---------------------------------------------------------------------------
-- RLS on with no policy at all is the correct expression of "no client may
-- read or write this". The service-role key bypasses RLS, which is how the
-- hook reads it; anon and authenticated get nothing, and there is deliberately
-- no policy to loosen later by accident.
alter table public.blocked_email_domains enable row level security;

revoke all on public.blocked_email_domains from anon, authenticated;
