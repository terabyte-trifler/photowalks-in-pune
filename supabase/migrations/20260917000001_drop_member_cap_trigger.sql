-- ============================================================================
-- PHOTOWALKS IN PUNE — 0029 · THE MEMBER CAP TRIGGER COMES OFF auth.users
-- ----------------------------------------------------------------------------
-- Migration 0028 put a BEFORE INSERT trigger on auth.users to enforce a
-- ceiling on accounts. The next day, signing up with an email address started
-- answering "Something went wrong at our end" — the generic fallback, which is
-- what a 500 from GoTrue looks like by the time it reaches a form.
--
-- The trigger is not proven guilty. joining_open() does the same count over
-- the same table through the same security definer path and answers correctly,
-- so the obvious failure — postgres unable to read auth.users — is ruled out.
-- But it is the newest thing standing in the signup path, it went in hours
-- before the symptom, and nothing on the site needs it today: there are 24
-- members against a cap of 500.
--
-- So it comes off. A cap that might be stopping every new member is worse than
-- no cap at all, and "might" is doing too much work while people cannot join.
--
-- WHAT IS KEPT
-- site_limits and joining_open() stay. Neither is in the insert path — the
-- table is read by a function nothing calls during signup, and joining_open()
-- is asked by /signup before the form is shown. If the trigger turns out to be
-- innocent, putting it back is one statement, and the number it reads is still
-- sitting there.
--
-- WHAT THE SITE LOSES
-- The database no longer refuses account 501. /signup still asks joining_open()
-- and still says joining is closed once the count is reached, so the cap
-- remains as a door that is shut rather than a wall — which is what it was
-- worth before anybody could have hit it.
-- ============================================================================

drop trigger if exists auth_users_enforce_member_cap on auth.users;

comment on function public.enforce_member_cap() is
  'NOT ATTACHED. The trigger was dropped in migration 0029 while a signup failure was being diagnosed. Re-attach with: create trigger auth_users_enforce_member_cap before insert on auth.users for each row execute function public.enforce_member_cap();';
