-- ============================================================================
-- PHOTOWALKS IN PUNE — 0023 · A TOKEN THAT SAYS WHEN IT IS IN TROUBLE
-- ----------------------------------------------------------------------------
-- The Instagram token expired, and the site said nothing for weeks. Migration
-- 0013 built the rotation correctly — refresh at 30 days, a month of slack
-- before Meta's 60 — and it still failed, for two reasons that have nothing to
-- do with the arithmetic.
--
-- IT ONLY RAN WHEN SOMEBODY LOADED THE HOMEPAGE
-- The function is called from the homepage render and from nowhere else, so
-- rotation depended on organic traffic arriving inside the 30-day window.
-- supabase/README.md names this exactly — "the one gap is a site nobody loads
-- for a month" — and offers the fix as optional. For a community site launched
-- in August with no visitors yet, a month without a page view is not the edge
-- case; it is the normal state. So the gap is closed here rather than left as
-- a suggestion.
--
-- AND WHEN REFRESH WAS REFUSED, IT WHISPERED
-- A refused refresh was a console.warn in a log nobody opens. The function
-- carried on with the old token and answered 200, so the site looked perfectly
-- healthy right up until the token died — at which point refresh can no longer
-- recover it, because Meta will not refresh an expired token. The failure was
-- silent for the entire month in which it was still fixable.
--
-- The comment justifying that ("Meta also refuses for reasons we can retry
-- past") was right that a refusal is not fatal. The conclusion should have been
-- retry AND record, not retry silently.
--
-- So the vault entry gains two fields, and a weekly job runs the refresh
-- whether or not anybody visits.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1 · THE TOKEN, AND HOW ITS LAST REFRESH WENT
-- ---------------------------------------------------------------------------
-- Same vault secret, two more fields in the JSON. A token stored by 0013 has
-- neither and reads back as "never failed", which is the right assumption for
-- one that has not been through this version yet.

create or replace function public.instagram_token_read()
returns table (
  token             text,
  refreshed_at      timestamptz,
  refresh_failed_at timestamptz,
  refresh_error     text
)
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

  -- A raw token is not valid JSON, which is how the two are told apart.
  begin
    v_json := v_raw::jsonb;
  exception when others then
    v_json := null;
  end;

  if v_json is null or v_json ->> 'token' is null then
    token := v_raw;
    refreshed_at := null;
    refresh_failed_at := null;
    refresh_error := null;
  else
    token := v_json ->> 'token';
    refreshed_at := (v_json ->> 'refreshed_at')::timestamptz;
    refresh_failed_at := (v_json ->> 'refresh_failed_at')::timestamptz;
    refresh_error := v_json ->> 'refresh_error';
  end if;

  return next;
end;
$$;

/**
 * Store a freshly rotated token. A success clears the failure fields: whatever
 * was wrong is over, and leaving a stale error next to a working token is how
 * a dashboard learns to cry wolf.
 */
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

/**
 * Record that a refresh was refused, WITHOUT touching the token.
 *
 * This is the whole point of the migration. The token is still whatever it
 * was — possibly still valid — so it must survive untouched; what changes is
 * that the refusal is now written down where a query can find it instead of
 * only in a log.
 *
 * `refreshed_at` is deliberately left alone. It is what decides whether a
 * refresh is due, and a failed attempt must not push the next one 30 days out.
 */
create or replace function public.instagram_token_note_failure(reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id      uuid;
  v_raw     text;
  v_json    jsonb;
  v_payload text;
begin
  select id into v_id from vault.secrets where name = 'instagram_token';
  if v_id is null then
    return;  -- nothing configured; nothing to annotate
  end if;

  select decrypted_secret into v_raw
    from vault.decrypted_secrets where name = 'instagram_token';

  begin
    v_json := v_raw::jsonb;
  exception when others then
    v_json := jsonb_build_object('token', v_raw);
  end;

  if v_json is null or v_json ->> 'token' is null then
    v_json := jsonb_build_object('token', v_raw);
  end if;

  v_payload := (v_json
                || jsonb_build_object(
                     'refresh_failed_at', now() at time zone 'utc',
                     'refresh_error', left(coalesce(reason, 'unknown'), 400)
                   ))::text;

  perform vault.update_secret(v_id, v_payload, 'instagram_token');
end;
$$;

-- ---------------------------------------------------------------------------
-- 2 · ONLY THE EDGE FUNCTION MAY TOUCH THESE
-- ---------------------------------------------------------------------------
-- These read and write a decrypted secret. Postgres grants EXECUTE to PUBLIC
-- by default, which would hand the Instagram token to any signed-in member —
-- the point migration 0009 was written to make, and it applies to the new
-- function exactly as it did to the other two.

revoke all on function public.instagram_token_read()               from public, anon, authenticated;
revoke all on function public.instagram_token_write(text)          from public, anon, authenticated;
revoke all on function public.instagram_token_note_failure(text)   from public, anon, authenticated;

grant execute on function public.instagram_token_read()             to service_role;
grant execute on function public.instagram_token_write(text)        to service_role;
grant execute on function public.instagram_token_note_failure(text) to service_role;

-- ---------------------------------------------------------------------------
-- 3 · REFRESH ON A SCHEDULE, NOT ON TRAFFIC
-- ---------------------------------------------------------------------------
-- Weekly, which against a 30-day refresh threshold and a 60-day expiry means
-- four attempts inside the window where a refusal is still recoverable. The
-- function decides whether anything is actually due; this only guarantees it
-- is asked.
--
-- Configuration lives in the vault, never in this file, and the job no-ops
-- when it is absent — which is what makes this safe to run against a project
-- with no Instagram at all:
--
--   select vault.create_secret(
--     'https://<project-ref>.supabase.co/functions/v1/instagram-posts',
--     'instagram_function_url', 'Endpoint the weekly refresh calls');
--   select vault.create_secret(
--     '<the project anon key>',
--     'instagram_function_key', 'Anon key used to invoke the function');
--
-- The anon key is not a secret — it ships in every page of the site — but it
-- belongs in the vault rather than in this file so that a fresh project, a
-- branch and a restored backup each carry their own.

create extension if not exists pg_cron;
create extension if not exists pg_net;

create or replace function public.instagram_refresh_tick()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_key text;
begin
  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'instagram_function_url';
  select decrypted_secret into v_key
    from vault.decrypted_secrets where name = 'instagram_function_key';

  if coalesce(v_url, '') = '' or coalesce(v_key, '') = '' then
    return;  -- not configured here; say nothing
  end if;

  perform net.http_get(
    url     := v_url || '?limit=1',
    headers := jsonb_build_object(
                 'Authorization', 'Bearer ' || v_key,
                 'apikey', v_key
               ),
    timeout_milliseconds := 10000
  );
exception
  when others then
    -- A missed tick is a week's delay, not a failure worth raising. There are
    -- four of them inside the recoverable window.
    return;
end;
$$;

comment on function public.instagram_refresh_tick() is
  'Pokes the instagram-posts Edge Function so token rotation does not depend on somebody loading the homepage.';

revoke all on function public.instagram_refresh_tick() from public, anon, authenticated;

-- Mondays at 03:20 UTC — off the hour, because everybody schedules on the hour.
do $$
begin
  perform cron.unschedule('instagram-token-refresh');
exception when others then
  null;  -- not scheduled yet, which is the normal first run
end
$$;

select cron.schedule(
  'instagram-token-refresh',
  '20 3 * * 1',
  $$ select public.instagram_refresh_tick(); $$
);
