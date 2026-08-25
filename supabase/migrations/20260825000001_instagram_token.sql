-- ============================================================================
-- PHOTOWALKS IN PUNE — 0013 · A TOKEN THAT ROTATES ITSELF
-- ----------------------------------------------------------------------------
-- Instagram long-lived tokens die after 60 days. Refreshing one returns a NEW
-- string, so wherever it lives has to be writable — which an environment
-- variable on Vercel is not. That is the whole reason the grid used to go
-- stale: nothing could store the answer.
--
-- So the token moves into the vault and the instagram-posts Edge Function
-- rotates it in passing, the same way migration 0006 hands work to
-- purge-user-storage. The app never sees the token at all; it asks the
-- function for six posts and gets JSON back.
--
-- WHY NOT A TABLE AND THE SERVICE-ROLE KEY IN THE APP
-- Because a table read with the anon key is readable by everybody, and the
-- service-role key bypasses RLS entirely — putting it in the Next app would
-- turn any future policy mistake into a full-database compromise. Edge
-- Functions are handed that key by the platform, inside Supabase, where it
-- never reaches a bundle or a Vercel environment. See "What is deliberately
-- not here" in supabase/README.md; this migration keeps that promise.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- The token itself lives in the vault, not in this file
-- ---------------------------------------------------------------------------
-- Set once, in the SQL editor, with the long-lived token from Meta:
--
--   select vault.create_secret(
--     '<the long-lived token>',
--     'instagram_token', 'Instagram long-lived token; rotated automatically');
--
-- Paste it raw — instagram_token_read() accepts a bare token and the first
-- rotation rewrites it as JSON carrying the date it was last refreshed. With
-- the secret absent both functions simply return nothing, which is what makes
-- this migration safe to run against a project that has no Instagram at all.

/**
 * The current token, and when it was last rotated.
 *
 * Returns no rows when unconfigured. `refreshed_at` is null for a token that
 * has never been through instagram_token_write — the caller treats that as
 * "old enough to refresh", because a token pasted by hand is usually already
 * some days into its sixty.
 */
create or replace function public.instagram_token_read()
returns table (token text, refreshed_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_raw  text;
  v_json jsonb;
begin
  select decrypted_secret into v_raw
    from vault.decrypted_secrets where name = 'instagram_token';

  if coalesce(v_raw, '') = '' then
    return;
  end if;

  -- A raw token is not valid JSON, which is exactly how we tell the two apart.
  begin
    v_json := v_raw::jsonb;
  exception when others then
    v_json := null;
  end;

  if v_json is null or v_json ->> 'token' is null then
    token := v_raw;
    refreshed_at := null;
  else
    token := v_json ->> 'token';
    refreshed_at := (v_json ->> 'refreshed_at')::timestamptz;
  end if;

  return next;
end;
$$;

/** Store a freshly rotated token, stamped with the moment it arrived. */
create or replace function public.instagram_token_write(new_token text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id      uuid;
  v_payload text;
begin
  if coalesce(new_token, '') = '' then
    raise exception 'instagram_token_write called with an empty token';
  end if;

  v_payload := jsonb_build_object(
                 'token', new_token,
                 'refreshed_at', now() at time zone 'utc'
               )::text;

  select id into v_id from vault.secrets where name = 'instagram_token';

  if v_id is null then
    perform vault.create_secret(
      v_payload, 'instagram_token',
      'Instagram long-lived token; rotated automatically');
  else
    perform vault.update_secret(v_id, v_payload, 'instagram_token');
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Only the Edge Function may touch either of these
-- ---------------------------------------------------------------------------
-- Postgres grants execute to public by default, which for a function reading a
-- decrypted secret would hand the token to any signed-in member. Migration
-- 0011 makes the same point about the directory functions.

revoke all on function public.instagram_token_read()      from public, anon, authenticated;
revoke all on function public.instagram_token_write(text) from public, anon, authenticated;

grant execute on function public.instagram_token_read()      to service_role;
grant execute on function public.instagram_token_write(text) to service_role;
