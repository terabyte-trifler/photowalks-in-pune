-- ============================================================================
-- PHOTOWALKS IN PUNE — 0010 · PROVING 0009 DID NOT BREAK SIGNUP
-- ----------------------------------------------------------------------------
-- 0009 revoked EXECUTE from PUBLIC on handle_new_user, the trigger that mints
-- a profile when somebody signs up. If PostgreSQL checked that privilege every
-- time the trigger fired, signup would now be broken for everybody, and the
-- first to know would be a real person trying to join a walk.
--
-- The claim is that PostgreSQL checks EXECUTE when a trigger is created, not
-- when it fires. This migration does not take that on faith. It reconstructs
-- the exact situation on scratch objects:
--
--   a trigger function with EXECUTE revoked from PUBLIC and every role
--   a trigger on a table that calls it
--   an insert performed as `authenticated`, which is what a member really is
--
-- and fails the push if the trigger does not fire. Everything it builds is
-- dropped at the end, so the database is left exactly as it was found.
-- ============================================================================

create schema if not exists audit_probe;

create table audit_probe.t (id integer primary key, stamped text);

create function audit_probe.fn() returns trigger
  language plpgsql as $fn$
  begin
    new.stamped := 'fired';
    return new;
  end;
  $fn$;

-- Exactly the state migration 0009 left handle_new_user in.
revoke all on function audit_probe.fn() from public;

create trigger trg before insert on audit_probe.t
  for each row execute function audit_probe.fn();

-- The probe role must be able to insert at all, or the test fails on its own
-- scaffolding and proves nothing. It is given rights on the table only —
-- pointedly not on the function.
grant usage on schema audit_probe to authenticated;
grant insert, select on audit_probe.t to authenticated;

set local role authenticated;
insert into audit_probe.t (id) values (1);
set local role postgres;

do $$
declare
  v_stamped text;
begin
  select stamped into v_stamped from audit_probe.t where id = 1;

  if v_stamped is distinct from 'fired' then
    raise exception
      'TRIGGER REGRESSION: a trigger whose function has EXECUTE revoked did not fire (stamped = %). Migration 0009 would have broken signup — revert it.', v_stamped;
  end if;

  raise notice 'VERIFIED: trigger fired as `authenticated` with EXECUTE revoked from PUBLIC. Signup is unaffected by 0009.';
end;
$$;

drop schema audit_probe cascade;
