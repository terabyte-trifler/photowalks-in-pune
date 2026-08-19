'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { AuthField } from '@/components/auth/AuthField';
import { AuthNotice } from '@/components/auth/AuthNotice';
import { useAuth } from '@/components/auth/AuthProvider';
import { LIMITS, validateConfirmPassword, validatePassword } from '@/lib/auth/validation';

type Status = 'editing' | 'saving' | 'saved';

export function ResetPasswordForm() {
  const { updatePassword, configured } = useAuth();
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});
  const [failure, setFailure] = useState('');
  const [status, setStatus] = useState<Status>('editing');

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (status !== 'editing') return;

    const found = {
      password: validatePassword(password),
      confirm: validateConfirmPassword(password, confirm),
    };
    if (found.password || found.confirm) {
      setErrors(found);
      return;
    }

    setErrors({});
    setFailure('');
    setStatus('saving');

    const result = await updatePassword(password);

    if (!result.ok) {
      setFailure(result.error ?? 'We could not change your password.');
      setStatus('editing');
      return;
    }

    setStatus('saved');
    router.refresh();
  }

  if (status === 'saved') {
    return (
      <div role="status">
        <p className="meta">Done</p>
        <p className="display mt-4 text-display-md">Password changed.</p>
        <p className="mt-4 font-display text-lead text-foreground-soft">
          You are logged in on this device. Anywhere else, use the new password.
        </p>

        <div className="mt-[clamp(2rem,4vw,2.5rem)] grid gap-4">
          <button
            type="button"
            className="cta-solid justify-between"
            onClick={() => router.replace('/profile')}
          >
            Go to my profile <span aria-hidden="true">→</span>
          </button>
          <button
            type="button"
            className="cta-ghost justify-between"
            onClick={() => router.replace('/')}
          >
            Back to the site <span aria-hidden="true">↩</span>
          </button>
        </div>
      </div>
    );
  }

  const busy = status === 'saving';

  return (
    <form onSubmit={handleSubmit} noValidate>
      {!configured && (
        <AuthNotice tone="info" className="mb-7">
          Preview build — no Supabase project is connected.
        </AuthNotice>
      )}

      <AuthField
        id="reset-password"
        label="New password"
        type="password"
        autoComplete="new-password"
        placeholder="••••••••"
        autoFocus
        value={password}
        error={errors.password}
        hint={`At least ${LIMITS.password.min} characters, with a letter and a number`}
        disabled={busy || !configured}
        onChange={(value) => {
          setPassword(value);
          setErrors((current) => ({ ...current, password: undefined }));
          if (failure) setFailure('');
        }}
      />

      <AuthField
        id="reset-confirm"
        label="Confirm new password"
        type="password"
        autoComplete="new-password"
        placeholder="••••••••"
        value={confirm}
        error={errors.confirm}
        disabled={busy || !configured}
        onChange={(value) => {
          setConfirm(value);
          setErrors((current) => ({ ...current, confirm: undefined }));
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
        disabled={busy || !configured}
        aria-busy={busy}
        className="cta-solid w-full justify-between disabled:opacity-60"
      >
        {busy ? 'Saving' : 'Save new password'} <span aria-hidden="true">→</span>
      </button>
    </form>
  );
}
