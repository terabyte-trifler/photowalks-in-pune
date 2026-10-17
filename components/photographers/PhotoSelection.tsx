'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { deletePhoto } from '@/components/photographers/PhotoDeleteButton';
import { archivedPhoto } from '@/lib/walk-archive';
import type { PhotoRecord } from '@/lib/supabase/types';

/**
 * Removing several of your own photographs at once.
 *
 * The 20-photograph limit means making room is a regular chore, and the ✕ on
 * each frame turns clearing out eight into sixteen presses. This is a mode:
 * "Select" turns every frame into a tick box, and the bar above counts what
 * is picked and deletes it, with the same ask-once confirm as the ✕.
 *
 * Owner only. WorkGrid renders this solely when `editable`, which the page sets
 * from the session; RLS refuses a delete on anybody else's row regardless.
 *
 * ON THE WALK ARCHIVE
 * A photograph filed under a walk stays on the walk after it is deleted here —
 * but only once the hourly archive has copied it. One that is tagged and not
 * yet copied would vanish from the walk too, and the confirm says so rather
 * than letting the promise in the announcement quietly fail.
 */

interface Selection {
  selecting: boolean;
  selected: Set<string>;
  toggle: (id: string) => void;
}

const SelectionContext = createContext<Selection | null>(null);

export function PhotoSelection({
  photos,
  total,
  allHref,
  children,
}: {
  photos: PhotoRecord[];
  /** Everything they hold, when the grid is only a slice of it. */
  total?: number;
  /** Where every photograph can be selected, when this grid is a slice. */
  allHref?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [progress, setProgress] = useState<{ done: number; of: number } | null>(null);
  const [error, setError] = useState('');

  const busy = progress !== null;
  const allSelected = photos.length > 0 && selected.size === photos.length;
  const chosen = photos.filter((photo) => selected.has(photo.id));
  const notYetKept = chosen.filter((photo) => photo.event_id && !archivedPhoto(photo.id)).length;
  const isSlice = total !== undefined && total > photos.length;

  function toggle(id: string) {
    if (busy) return;
    setConfirming(false);
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function stop() {
    setSelecting(false);
    setSelected(new Set());
    setConfirming(false);
    setError('');
  }

  async function removeChosen() {
    setError('');
    setProgress({ done: 0, of: chosen.length });

    /* One at a time: each is the file and then the row, and twenty in
       parallel is twenty chances to trip a rate limit for no visible gain. */
    const failed = new Set<string>();
    for (const [index, photo] of chosen.entries()) {
      if (!(await deletePhoto(photo))) failed.add(photo.id);
      setProgress({ done: index + 1, of: chosen.length });
    }

    setProgress(null);
    setConfirming(false);
    setSelected(failed);
    if (failed.size > 0) {
      setError(`${failed.size} could not be removed. They are still selected — try again.`);
    } else {
      setSelecting(false);
    }
    router.refresh();
  }

  return (
    <SelectionContext.Provider value={{ selecting, selected, toggle }}>
      <div className="mb-[clamp(1rem,2vw,1.5rem)] flex flex-wrap items-center gap-x-5 gap-y-3">
        {!selecting ? (
          <button type="button" onClick={() => setSelecting(true)} className="cta">
            Select photos to remove
          </button>
        ) : (
          <>
            <span className="meta normal-case tracking-[0.08em]" aria-live="polite">
              {progress
                ? `Removing ${progress.done} of ${progress.of}`
                : `${selected.size} selected`}
            </span>

            <button
              type="button"
              onClick={() => {
                setConfirming(false);
                setSelected(allSelected ? new Set() : new Set(photos.map((photo) => photo.id)));
              }}
              disabled={busy}
              className="cta disabled:opacity-60"
            >
              {allSelected ? 'Clear' : isSlice ? `Select these ${photos.length}` : 'Select all'}
            </button>

            {confirming ? (
              <span className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <span className="meta normal-case tracking-[0.08em] text-foreground-soft">
                  Remove {selected.size} from your profile?
                </span>
                <button
                  type="button"
                  onClick={() => void removeChosen()}
                  disabled={busy}
                  aria-busy={busy}
                  className="cta-solid disabled:opacity-60"
                >
                  {busy ? 'Removing' : 'Yes, remove'}
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={busy}
                  className="cta disabled:opacity-60"
                >
                  Keep
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setConfirming(true)}
                disabled={busy || selected.size === 0}
                className="cta-solid disabled:opacity-60"
              >
                Remove {selected.size || ''} <span aria-hidden="true">→</span>
              </button>
            )}

            <button
              type="button"
              onClick={stop}
              disabled={busy}
              className="font-mono text-micro uppercase text-muted transition-colors hover:text-foreground disabled:opacity-60"
            >
              Cancel
            </button>

            {isSlice && allHref && !busy && (
              <Link href={allHref} className="meta normal-case tracking-[0.08em] hover:text-accent">
                Showing {photos.length} of {total} — select from all <span aria-hidden="true">→</span>
              </Link>
            )}
          </>
        )}
      </div>

      {confirming && notYetKept > 0 && (
        <p role="alert" className="mb-4 max-w-[60ch] font-mono text-micro uppercase leading-relaxed text-accent">
          {notYetKept === 1 ? '1 of these is' : `${notYetKept} of these are`} on a walk but not saved
          to it yet — removing now takes {notYetKept === 1 ? 'it' : 'them'} off the walk too. Wait
          about an hour after uploading to keep {notYetKept === 1 ? 'it' : 'them'} there.
        </p>
      )}

      {error && (
        <p role="alert" className="mb-4 font-mono text-micro uppercase text-accent">
          {error}
        </p>
      )}

      {children}
    </SelectionContext.Provider>
  );
}

/**
 * The tick box laid over a frame while selecting. It covers the whole frame,
 * so a tap anywhere picks it, and it sits above the ✕ so the two cannot be
 * confused mid-selection. Renders nothing outside a PhotoSelection or when
 * not selecting.
 */
export function PhotoSelectToggle({ photoId }: { photoId: string }) {
  const selection = useContext(SelectionContext);
  if (!selection?.selecting) return null;

  const on = selection.selected.has(photoId);
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      aria-label={on ? 'Selected — tap to unselect' : 'Select this photograph'}
      onClick={() => selection.toggle(photoId)}
      className={
        'absolute inset-0 z-20 flex items-start justify-end p-2 transition-colors ' +
        (on ? 'bg-[rgba(14,12,10,0.35)] ring-2 ring-inset ring-accent' : 'bg-transparent hover:bg-[rgba(14,12,10,0.15)]')
      }
    >
      <span
        aria-hidden="true"
        className={
          'grid h-7 w-7 place-items-center border font-mono text-[0.8rem] leading-none ' +
          (on
            ? 'border-accent bg-accent text-white'
            : 'border-[rgba(245,241,234,0.8)] bg-[rgba(14,12,10,0.45)] text-transparent')
        }
      >
        ✓
      </span>
    </button>
  );
}
