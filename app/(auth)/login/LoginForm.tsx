'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AuthDivider } from '@/components/auth/AuthShell';
import { AuthField } from '@/components/auth/AuthField';
import { AuthNotice } from '@/components/auth/AuthNotice';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { useAuth } from '@/components/auth/AuthProvider';
import { CALLBACK_ERRORS } from '@/lib/auth/errors';
import { validateEmail } from '@/lib/auth/validation';
import { safeNext } from '@/lib/auth/redirects';

type Status = 'editing' | 'submitting' | 'done';

/** Messages a redirect can hand to this page, e.g. after a password reset. */
const MESSAGES: Record<string, string> = {
  'password-updated': 'Your password has been changed. Log in with it now.',
  'check-email': 'Confirm your email using the link we sent, then log in.',
};

export function LoginForm({
  next,
  reason,
  callbackError,
  message,
}: {
  next?: string;
  reason?: string;
  callbackError?: string;
  message?: string;
}) {
  const { signIn, configured } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [failure, setFailure] = useState('');
  const [status, setStatus] = useState<Status>('editing');

  const destination = safeNext(next, '/profile');
  const notice = callbackError ? CALLBACK_ERRORS[callbackError] : undefined;
  const info = message ? MESSAGES[message] : undefined;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (status !== 'editing') return;

    const found = {
      email: validateEmail(email),
      password: password ? undefined : 'Type your password.',
    };
    if (found.email || found.password) {
      setErrors(found);
      return;
    }

    setErrors({});
    setFailure('');
    setStatus('submitting');

    const result = await signIn(email, password);

    if (!result.ok) {
      setFailure(result.error ?? 'That did not work.');
      setStatus('editing');
      return;
    }

    /* A document navigation rather than router.replace() + router.refresh():
       those two race, and the refresh discards the pending navigation. It also
       guarantees every server component is rendered for the new session
       instead of being served from the client router cache.

       The status stays 'done' so the button reads "Logging in" until the new
       document paints — flipping it back for a frame reads as a failure. */
    setStatus('done');
    window.location.assign(destination);
  }

  const busy = status !== 'editing';

  return (
    <>
      {!configured && (
        <AuthNotice tone="info" className="mb-7">
          Preview build — no Supabase project is connected, so logging in is switched
          off. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to turn
          accounts on.
        </AuthNotice>
      )}

      {reason && (
        <AuthNotice tone="info" className="mb-7">
          Log in {reason}.
        </AuthNotice>
      )}

      {notice && (
        <AuthNotice tone="error" className="mb-7">
          {notice}
        </AuthNotice>
      )}

      {info && (
        <AuthNotice tone="success" className="mb-7">
          {info}
        </AuthNotice>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <AuthField
          id="login-email"
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          error={errors.email}
          disabled={busy || !configured}
          onChange={(value) => {
            setEmail(value);
            if (errors.email) setErrors((current) => ({ ...current, email: undefined }));
            if (failure) setFailure('');
          }}
        />

        <AuthField
          id="login-password"
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          value={password}
          error={errors.password}
          disabled={busy || !configured}
          onChange={(value) => {
            setPassword(value);
            if (errors.password) setErrors((current) => ({ ...current, password: undefined }));
            if (failure) setFailure('');
          }}
        />

        <div className="-mt-2 mb-7 flex justify-end">
          <Link
            href="/forgot-password"
            className="font-mono text-micro uppercase text-muted transition-colors hover:text-accent"
          >
            Forgot your password?
          </Link>
        </div>

        {failure && (
          <AuthNotice tone="error" className="mb-6">
            {failure}
          </AuthNotice>
        )}

        <button
          type="submit"
          disabled={busy || !configured}
          aria-busy={status === 'submitting'}
          className="cta-solid w-full justify-between disabled:opacity-60"
        >
          {status === 'editing' ? 'Log in' : 'Logging in'} <span aria-hidden="true">→</span>
        </button>
      </form>

      <AuthDivider />

      <GoogleButton next={destination} label="Continue with Google" />
    </>
  );
}
