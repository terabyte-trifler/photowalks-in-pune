'use client';

import { useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { SUPABASE_URL } from '@/lib/supabase/config';

/* ============================================================================
 * LEAVING
 * ----------------------------------------------------------------------------
 * The only irreversible thing on the site, so it is the only thing that asks
 * you to type something. A two-press confirm is right for giving up a walk; it
 * is not enough for deleting everything you have made.
 *
 * The work happens in the delete-account Edge Function, because removing a row
 * from auth.users needs the service-role key and that key has no business in
 * this application's environment. The function reads who you are from your own
 * token, so it can only ever delete the person asking.
 * ========================================================================== */

type State = 'idle' | 'confirming' | 'deleting' | 'done';

export function DeleteAccount({ username }: { username: string }) {
  const { user, signOut } = useAuth();
  const [state, setState] = useState<State>('idle');
  const [typed, setTyped] = useState('');
  const [error, setError] = useState('');

  const matches = typed.trim().toLowerCase() === username.toLowerCase();

  async function handleDelete() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase || !user) return;

    setState('deleting');
    setError('');

    const { data: sessionResult } = await supabase.auth.getSession();
    const token = sessionResult.session?.access_token;
    if (!token) {
      setError('Your session has expired. Log in again.');
      setState('confirming');
      return;
    }

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/delete-account`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error ?? 'We could not delete the account. Try again in a moment.');
        setState('confirming');
        return;
      }
    } catch {
      setError('We could not reach the server. Check your connection and try again.');
      setState('confirming');
      return;
    }

    setState('done');
    /* The account is gone; the session in this browser is now meaningless. */
    await signOut();
  }

  if (state === 'done') {
    return (
      <div className="border-l-2 border-border-strong bg-subtle py-5 pl-5 pr-4" role="status">
        <p className="meta">Deleted</p>
        <p className="mt-3 max-w-[52ch] text-body text-foreground-soft">
          Your account and everything in it is gone. Thank you for walking with us.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-[clamp(2.5rem,5vw,3.5rem)] border-t border-border pt-[clamp(1.5rem,3vw,2rem)]">
      <p className="meta">Leaving</p>

      {state === 'idle' ? (
        <>
          <p className="mt-3 max-w-[56ch] text-body text-foreground-soft">
            You can delete your account whenever you like. Your profile, your
            photographs and the record of the walks you joined are removed from our
            database and our storage — not hidden, and not kept as a backup. It
            cannot be undone.
          </p>
          <button
            type="button"
            onClick={() => setState('confirming')}
            className="mt-5 font-mono text-micro uppercase text-muted underline underline-offset-4 transition-colors hover:text-accent"
          >
            Delete my account
          </button>
        </>
      ) : (
        <div className="mt-4 border-l-2 border-accent bg-subtle py-5 pl-5 pr-4">
          <p className="display text-display-sm">This cannot be undone.</p>
          <p className="mt-3 max-w-[52ch] text-body text-foreground-soft">
            Everything goes: your profile, your photographs, and your place on any
            walk you have joined. To confirm, type your username{' '}
            <span className="font-mono text-foreground">{username}</span> below.
          </p>

          <div className="mt-5 max-w-[22rem]">
            <label className="field-label" htmlFor="delete-confirm">
              Your username
            </label>
            <input
              id="delete-confirm"
              className="field-input"
              value={typed}
              autoComplete="off"
              disabled={state === 'deleting'}
              onChange={(event) => {
                setTyped(event.target.value);
                if (error) setError('');
              }}
            />
          </div>

          {error && (
            <p role="alert" className="mt-4 font-mono text-micro uppercase text-accent">
              {error}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3">
            <button
              type="button"
              onClick={handleDelete}
              disabled={!matches || state === 'deleting'}
              aria-busy={state === 'deleting'}
              className="cta-solid disabled:opacity-40"
            >
              {state === 'deleting' ? 'Deleting everything' : 'Delete my account'}{' '}
              <span aria-hidden="true">→</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setState('idle');
                setTyped('');
                setError('');
              }}
              disabled={state === 'deleting'}
              className="font-mono text-micro uppercase text-muted transition-colors hover:text-foreground"
            >
              Keep my account
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
