'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { removeImageSurely } from '@/lib/uploads';
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
 * The file goes first and the row second. Deleting a photograph is supposed
 * to take the bytes with it, so if storage will not let go of the file the
 * whole thing is abandoned and the photograph stays intact and consistent —
 * rather than dropping the row and leaving an invisible copy behind that
 * nobody can see, nobody asked for, and everybody pays for.
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

    /* The bytes first. If this fails nothing else happens, so the photograph
       is never half-deleted. */
    const fileGone = await removeImageSurely('photo', photo.storage_path);
    if (!fileGone) {
      setError('Could not remove');
      setBusy(false);
      setConfirming(false);
      return;
    }

    const { error: deleteError } = await supabase.from('photos').delete().eq('id', photo.id);
    if (deleteError) {
      /* The file is gone but the row survived — visible as a broken frame, and
         the next save or the storage sweep tidies it. Better than the silent
         alternative. */
      setError('Could not remove');
      setBusy(false);
      setConfirming(false);
      return;
    }

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
