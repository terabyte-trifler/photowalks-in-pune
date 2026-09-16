-- ============================================================================
-- PHOTOWALKS IN PUNE — 0027 · THE EMAIL ADDRESS, FOR ADMINS ONLY
-- ----------------------------------------------------------------------------
-- The organiser's sheet (migration 0026) shows a WhatsApp number because that
-- is the column walk_rsvps carries. An email address is not in walk_rsvps, and
-- it is not in profiles either — it lives in auth.users, which PostgREST does
-- not expose and no policy can reach.
--
-- So reading one takes a function that crosses out of the public schema on
-- purpose, and the whole of this migration is about making that crossing as
-- narrow as it can be:
--
--   · it answers only for admins           — is_walk_admin() inside the body,
--                                            so a non-admin gets zero rows
--                                            rather than an error to probe
--   · it answers only about people who     — the exists() clause. A member who
--     have joined a walk                     never signed up for anything is
--                                            not in the result at all
--   · it returns the address and nothing    — not the password hash, not the
--     else                                   confirmation tokens, not the
--                                            provider identity, all of which
--                                            sit in the same row
--   · authenticated may execute it, public  — an anonymous visitor cannot call
--     may not                                it even to be told "no"
--
-- WHY A FUNCTION AND NOT A VIEW ON auth.users
-- A view runs as its caller and would need a grant on auth.users to be useful,
-- which is a much larger door than this and one that outlives any policy
-- written in front of it. The function is the door, and its body is the lock.
--
-- WHAT THIS CHANGES ABOUT THE SITE'S PROMISES
-- /privacy currently says, in bold: "Your email address and your WhatsApp
-- number are never shown on the site and cannot be read through it." That
-- sentence was true when it was written. It stopped being true of WhatsApp
-- numbers when 0026 shipped, and this migration does the same to the email
-- address. The page has to be brought in step with the product, and that is a
-- decision for whoever owns the policy — but it must not be left as it is.
-- ============================================================================

create or replace function public.walk_rsvp_emails()
returns table (profile_id uuid, email text)
language sql
stable
security definer
set search_path = ''
as $$
  select u.id, u.email::text
  from auth.users u
  where public.is_walk_admin()
    and exists (
      select 1 from public.walk_rsvps r where r.profile_id = u.id
    );
$$;

comment on function public.walk_rsvp_emails() is
  'Email addresses of members who have joined a walk. Returns nothing unless the caller is in walk_admins. Reads auth.users, so it is security definer and deliberately narrow.';

revoke execute on function public.walk_rsvp_emails() from public;
grant execute on function public.walk_rsvp_emails() to authenticated;
