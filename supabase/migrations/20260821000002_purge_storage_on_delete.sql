-- ============================================================================
-- PHOTOWALKS IN PUNE — 0006 · TAKE THE FILES WITH THE ACCOUNT
-- ----------------------------------------------------------------------------
-- Deleting an account cascades its rows away, but nothing reaches into a
-- bucket. Until now the files were left behind — invisible, permanent, still
-- billed — and only the sweep in scripts/prune-storage.mjs eventually caught
-- them. This closes that gap at the moment of deletion, however the account is
-- deleted: from the dashboard, from the admin API, or from the app.
--
-- WHY THIS CALLS OUT INSTEAD OF DELETING DIRECTLY
-- The tempting version is `delete from storage.objects`. It is a trap: that
-- table holds the *metadata*, while the bytes live in S3. Removing the row
-- makes the file invisible to the Storage API, so nothing can ever list or
-- delete it again — stranded, and still paid for. Only the Storage API
-- removes both halves, so the trigger asks an Edge Function to do it.
--
-- WHY IT CANNOT FAIL A DELETION
-- pg_net queues the request and returns immediately, so a slow or unreachable
-- function cannot hold up or roll back the delete. If the call is lost the
-- files simply wait for the sweep, which is exactly where they were before.
-- Belt and braces, in that order.
-- ============================================================================

create extension if not exists pg_net;

-- ---------------------------------------------------------------------------
-- Configuration lives in the vault, not in this file
-- ---------------------------------------------------------------------------
-- Set once per project, and never committed:
--
--   select vault.create_secret(
--     'https://<project-ref>.supabase.co/functions/v1/purge-user-storage',
--     'purge_function_url', 'Endpoint the delete trigger calls');
--   select vault.create_secret(
--     '<same value as the PURGE_SECRET given to `supabase secrets set`>',
--     'purge_secret', 'Shared secret the function checks');
--
-- The vault keeps them encrypted at rest and out of every dump and backup,
-- which a database setting would not. Neither is required: with them absent
-- the trigger does nothing at all and the sweep remains the safety net, which
-- is what makes this migration safe to run against a fresh project.

create or replace function public.purge_user_storage()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url    text;
  v_secret text;
begin
  select decrypted_secret into v_url
    from vault.decrypted_secrets where name = 'purge_function_url';
  select decrypted_secret into v_secret
    from vault.decrypted_secrets where name = 'purge_secret';

  if coalesce(v_url, '') = '' or coalesce(v_secret, '') = '' then
    -- Not configured here. Say nothing, delete the account, let the sweep tidy.
    return old;
  end if;

  perform net.http_post(
    url     := v_url,
    body    := jsonb_build_object('user_id', old.id),
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'x-purge-secret', v_secret
               ),
    timeout_milliseconds := 5000
  );

  return old;
exception
  when others then
    -- Losing the files is bad; refusing to delete somebody's account because
    -- a webhook misbehaved is worse. Swallow it and let the sweep catch up.
    return old;
end;
$$;

comment on function public.purge_user_storage() is
  'Asks the purge-user-storage Edge Function to empty a departing member''s storage folders.';

drop trigger if exists on_auth_user_deleted on auth.users;
create trigger on_auth_user_deleted
  after delete on auth.users
  for each row execute function public.purge_user_storage();
