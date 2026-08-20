-- ============================================================================
-- PHOTOWALKS IN PUNE — 0009 · REVOKING FROM anon IS NOT REVOKING
-- ----------------------------------------------------------------------------
-- Migration 0008 revoked EXECUTE on the signup helpers from anon and
-- authenticated. Re-testing said they were still callable:
--
--   POST /rest/v1/rpc/create_profile_for_user   ->  23503, foreign key
--
-- A foreign key error means the function ran. If the revoke had worked the
-- answer would have been 42501 long before any row was touched.
--
-- PostgreSQL grants EXECUTE on every new function to PUBLIC. pg_dump does not
-- print it, because it is the default rather than something anybody chose — so
-- the dump showed no anon grant and the function was open anyway. anon and
-- authenticated are members of PUBLIC, and revoking a privilege from a role
-- does nothing about a privilege held by a group that role belongs to.
--
-- This is the same shape of mistake as the one 0008 was written to fix: a
-- privilege that arrives by default, is invisible in the schema, and is not
-- removed by the statement that looks like it removes it. Tables are not
-- affected — only functions, procedures, types and languages carry a default
-- PUBLIC grant.
--
-- service_role keeps its access: the Edge Functions run as service_role and
-- must still be able to call into these.
-- ============================================================================

revoke all on function public.create_profile_for_user(uuid, text, jsonb) from public;
revoke all on function public.generate_username(text, text, integer)     from public;
revoke all on function public.slugify_username(text)                     from public;
revoke all on function public.handle_new_user()                          from public;
revoke all on function public.profiles_touch_updated_at()                from public;
revoke all on function public.enforce_photo_limit()                      from public;
revoke all on function public.purge_user_storage()                       from public;

-- And for anything added later, so the next function is not open on arrival.
alter default privileges in schema public revoke execute on functions from public;
