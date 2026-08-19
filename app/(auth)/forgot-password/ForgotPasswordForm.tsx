'use client';

import Link from 'next/link';
import { useState } from 'react';
import { AuthField } from '@/components/auth/AuthField';
import { AuthNotice } from '@/components/auth/AuthNotice';
import { useAuth } from '@/components/auth/AuthProvider';
import { CALLBACK_ERRORS } from '@/lib/auth/errors';
import { validateEmail } from '@/lib/auth/validation';

type Status = 'editing' | 'sending' | 'sent';

export function ForgotPasswordForm({ callbackError }: { callbackError?: string }) {
  const { sendPasswordReset, configured } = useAuth();

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [failure, setFailure] = useState('');
  const [status, setStatus] = useState<Status>('editing');

  const notice = callbackError ? CALLBACK_ERRORS[callbackError] : undefined;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (status === 'sending') return;

    const found = validateEmail(email);
    if (found) {
      setError(found);
      return;
    }

    setError(undefined);
    setFailure('');
    setStatus('sending');

    const result = await sendPasswordReset(email);

    /* Supabase answers the same way whether or not the address is registered,
       and so do we: telling somebody which emails have accounts is a way of
       enumerating our members. Only a genuine failure — rate limit, network,
       provider down — is reported. */
    if (!result.ok) {
      setFailure(result.error ?? 'We could not send that email.');
      setStatus('editing');
      return;
    }

    setStatus('sent');
  }

  if (status === 'sent') {
    return (
      <div role="status">
        <p className="meta">Sent</p>
        <p className="display mt-4 text-display-md">Check your inbox.</p>
        <p className="mt-4 font-display text-lead text-foreground-soft">
          If <span className="text-foreground">{email.trim()}</span> has an account, a
          link to set a new password is on its way. It expires in an hour.
        </p>
        <p className="meta mt-6">
          Nothing there? Look in spam, then{' '}
          <button
            type="button"
            className="text-foreground underline underline-offset-4 transition-colors hover:text-accent"
            onClick={() => setStatus('editing')}
          >
            try another address
          </button>
          .
        </p>

        <div className="mt-[clamp(2rem,4vw,2.5rem)]">
          <Link href="/login" className="cta-ghost justify-between">
            Back to log in <span aria-hidden="true">↩</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {!configured && (
        <AuthNotice tone="info" className="mb-7">
          Preview build — no Supabase project is connected, so no email can be sent.
        </AuthNotice>
      )}

      {notice && (
        <AuthNotice tone="error" className="mb-7">
          {notice}
        </AuthNotice>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <AuthField
          id="forgot-email"
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          error={error}
          disabled={status === 'sending' || !configured}
          onChange={(value) => {
            setEmail(value);
            setError(undefined);
            if (failure) setFailure('');
          }}
        />

        {failure && (
          <AuthNotice tone="error" className="mb-6">
            {failure}
          </AuthNotice>
        )}

        <button
          type="submit"
          disabled={status === 'sending' || !configured}
          aria-busy={status === 'sending'}
          className="cta-solid w-full justify-between disabled:opacity-60"
        >
          {status === 'sending' ? 'Sending the link' : 'Send the reset link'}{' '}
          <span aria-hidden="true">→</span>
        </button>
      </form>
    </>
  );
}
