'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { cancelRsvp } from '@/lib/rsvp';

/**
 * Leaving a walk. Two presses rather than a browser `confirm()` — a native
 * dialog would be the only modal on the site that is not the Dialog component,
 * and giving up a spot is worth a moment's pause but not a whole overlay.
 *
 * The delete is scoped by the RLS policy to the caller's own row, so nothing
 * here needs to be trusted.
 */
export function CancelRsvpButton({ rsvpId, walkTitle }: { rsvpId: string; walkTitle: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleCancel() {
    setBusy(true);
    setError('');

    const result = await cancelRsvp(rsvpId);
    if (!result.ok) {
      setError(result.error ?? 'That did not work.');
      setBusy(false);
      setConfirming(false);
      return;
    }

    /* The list is server-rendered, so ask the server for it again. */
    router.refresh();
  }

  if (error) {
    return (
      <span className="font-mono text-micro uppercase text-accent" role="alert">
        {error}
      </span>
    );
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="font-mono text-micro uppercase text-muted transition-colors hover:text-accent"
      >
        Cancel
        <span className="sr-only"> your place on {walkTitle}</span>
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-4">
      <button
        type="button"
        onClick={handleCancel}
        disabled={busy}
        aria-busy={busy}
        className="font-mono text-micro uppercase text-accent transition-opacity disabled:opacity-60"
      >
        {busy ? 'Cancelling' : 'Give up my spot'}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={busy}
        className="font-mono text-micro uppercase text-muted transition-colors hover:text-foreground"
      >
        Keep it
      </button>
    </span>
  );
}
