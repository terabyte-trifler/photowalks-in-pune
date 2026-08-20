'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { removeImage } from '@/lib/uploads';
import type { PhotoRecord } from '@/lib/supabase/types';

/**
 * The ✕ in the corner of your own photograph. Hidden until the cursor is over
 * the frame, so the grid stays a grid and not a row of controls.
 *
 * Three things it has to do besides look right:
 *
 *   - appear on keyboard focus as well as hover, or it cannot be reached
 *     without a mouse;
 *   - stay visible on touch, where there is no hover at all — hence the
 *     `hover: none` media query;
 *   - ask once before deleting. A misplaced click on a ✕ should not cost
 *     somebody a photograph, and this is the same two-press pattern as
 *     giving up a walk.
 *
 * The row goes first and the file second: if the row delete fails the
 * photograph is still whole, whereas the other order would leave a row
 * pointing at nothing.
 */
export function PhotoDeleteButton({ photo }: { photo: PhotoRecord }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleDelete() {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setBusy(true);
    setError('');

    const { error: deleteError } = await supabase.from('photos').delete().eq('id', photo.id);
    if (deleteError) {
      setError('Could not remove');
      setBusy(false);
      setConfirming(false);
      return;
    }

    void removeImage('photo', photo.storage_path);
    router.refresh();
  }

  if (error) {
    return (
      <span
        role="alert"
        className="absolute right-2 top-2 z-10 bg-background px-2 py-1 font-mono text-micro uppercase text-accent"
      >
        {error}
      </span>
    );
  }

  if (confirming) {
    return (
      <span className="absolute inset-x-2 top-2 z-10 flex items-center justify-between gap-2 bg-background/95 px-3 py-2 backdrop-blur-sm">
        <span className="font-mono text-micro uppercase text-foreground-soft">Remove this?</span>
        <span className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy}
            aria-busy={busy}
            className="font-mono text-micro uppercase text-accent disabled:opacity-60"
          >
            {busy ? 'Removing' : 'Yes'}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={busy}
            className="font-mono text-micro uppercase text-muted transition-colors hover:text-foreground"
          >
            Keep
          </button>
        </span>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      aria-label={`Remove this photograph${photo.caption ? `: ${photo.caption}` : ''}`}
      className="absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center border border-[rgba(245,241,234,0.5)] bg-[rgba(14,12,10,0.55)] font-mono text-[0.8rem] leading-none text-[#F5F1EA] opacity-0 backdrop-blur-sm transition-[opacity,background-color] duration-300 ease-editorial hover:bg-accent hover:text-white focus-visible:opacity-100 group-hover/frame:opacity-100 [@media(hover:none)]:opacity-100"
    >
      <span aria-hidden="true">✕</span>
    </button>
  );
}
