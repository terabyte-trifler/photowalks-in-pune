'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AuthDivider } from '@/components/auth/AuthShell';
import { AuthField } from '@/components/auth/AuthField';
import { AuthNotice } from '@/components/auth/AuthNotice';
import { GoogleButton } from '@/components/auth/GoogleButton';
import { useAuth } from '@/components/auth/AuthProvider';
import { CALLBACK_ERRORS } from '@/lib/auth/errors';
import { safeNext } from '@/lib/auth/redirects';
import {
  LIMITS,
  suggestUsername,
  validateConfirmPassword,
  validateEmail,
  validateFullName,
  validatePassword,
} from '@/lib/auth/validation';

type Status = 'editing' | 'submitting' | 'confirm-email' | 'done';

interface Errors {
  fullName?: string;
  email?: string;
  password?: string;
  confirm?: string;
}

export function SignupForm({ next, callbackError }: { next?: string; callbackError?: string }) {
  const { signUp, configured } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [failure, setFailure] = useState('');
  const [status, setStatus] = useState<Status>('editing');

  const destination = safeNext(next, '/profile');
  const notice = callbackError ? CALLBACK_ERRORS[callbackError] : undefined;

  /* Shown under the name field, so nobody is surprised by the handle the
     database mints for them. The real one comes from generate_username(). */
  const previewUsername = fullName.trim() ? suggestUsername(fullName) : '';

  const clear = (key: keyof Errors) => {
    setErrors((current) => (current[key] ? { ...current, [key]: undefined } : current));
    if (failure) setFailure('');
  };

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (status === 'submitting') return;

    const found: Errors = {
      fullName: validateFullName(fullName),
      email: validateEmail(email),
      password: validatePassword(password),
      confirm: validateConfirmPassword(password, confirm),
    };

    if (found.fullName || found.email || found.password || found.confirm) {
      setErrors(found);
      return;
    }

    setErrors({});
    setFailure('');
    setStatus('submitting');

    const result = await signUp({ fullName, email, password });

    if (!result.ok) {
      setFailure(result.error ?? 'We could not create that account.');
      setStatus('editing');
      return;
    }

    /* Whether people land straight in the site or have to confirm their email
       first is a project setting (Authentication → Providers → Email →
       Confirm email), so handle both. */
    if (result.needsEmailConfirmation) {
      setStatus('confirm-email');
      return;
    }

    /* See the note in LoginForm: a document navigation, not router.replace()
       plus router.refresh(). */
    setStatus('done');
    window.location.assign(destination);
  }

  /* ---- Success: the account exists, the inbox has the last word --------- */
  if (status === 'confirm-email') {
    return (
      <div role="status">
        <p className="meta">Check your inbox</p>
        <p className="display mt-4 text-display-md">One more step.</p>
        <p className="mt-4 font-display text-lead text-foreground-soft">
          We have sent a confirmation link to <span className="text-foreground">{email.trim()}</span>.
          Open it and your account is ready.
        </p>
        <p className="meta mt-6">
          Nothing there? Look in spam, or{' '}
          <Link href="/signup" className="text-foreground transition-colors hover:text-accent">
            try a different address
          </Link>
          .
        </p>

        <div className="mt-[clamp(2rem,4vw,2.5rem)] grid gap-4">
          <Link href="/login" className="cta-solid justify-between">
            Go to log in <span aria-hidden="true">→</span>
          </Link>
          <Link href="/" className="cta-ghost justify-between">
            Back to the site <span aria-hidden="true">↩</span>
          </Link>
        </div>
      </div>
    );
  }

  const busy = status !== 'editing';

  return (
    <>
      {!configured && (
        <AuthNotice tone="info" className="mb-7">
          Preview build — no Supabase project is connected, so accounts are switched
          off. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to turn
          them on.
        </AuthNotice>
      )}

      {notice && (
        <AuthNotice tone="error" className="mb-7">
          {notice}
        </AuthNotice>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <AuthField
          id="signup-name"
          label="Full name"
          autoComplete="name"
          placeholder="Gurnoor Singh"
          maxLength={LIMITS.fullName}
          value={fullName}
          error={errors.fullName}
          hint={
            previewUsername
              ? `Your handle will be ${previewUsername}, or the next one free`
              : undefined
          }
          disabled={busy || !configured}
          onChange={(value) => {
            setFullName(value);
            clear('fullName');
          }}
        />

        <AuthField
          id="signup-email"
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
            clear('email');
          }}
        />

        <AuthField
          id="signup-password"
          label="Password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={password}
          error={errors.password}
          hint={`At least ${LIMITS.password.min} characters, with a letter and a number`}
          disabled={busy || !configured}
          onChange={(value) => {
            setPassword(value);
            clear('password');
            if (confirm) clear('confirm');
          }}
        />

        <AuthField
          id="signup-confirm"
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={confirm}
          error={errors.confirm}
          disabled={busy || !configured}
          onChange={(value) => {
            setConfirm(value);
            clear('confirm');
          }}
        />

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
          {status === 'editing' ? 'Create my account' : 'Creating your account'}{' '}
          <span aria-hidden="true">→</span>
        </button>

        <p className="meta mt-5 normal-case tracking-[0.06em]">
          By joining you agree to walk considerately and to ask before photographing
          people. We only use your email for walk details.
        </p>
      </form>

      <AuthDivider />

      <GoogleButton next={destination} label="Continue with Google" />
    </>
  );
}
