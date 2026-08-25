'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { MAX_PHOTOS_PER_MEMBER } from '@/lib/directory';
import {
  ACCEPT_ATTRIBUTE,
  checkFile,
  photoInsertError,
  removeImageSurely,
  uploadImage,
} from '@/lib/uploads';
import type { PhotoRecord } from '@/lib/supabase/types';
import { allWalksNewestFirst } from '@/data/events';
import { longDate } from '@/lib/utils';

/**
 * Adding and removing your own photographs.
 *
 * Two fields sit above the button: which walk these came from, and a caption.
 * Both are optional and both apply to the whole upload, because a batch is
 * almost always one walk's worth — asking per file would turn one action into
 * five. Anything more particular is edited on the row afterwards.
 *
 * The walk is what puts a photograph on /walks/[slug]. It is a plain select
 * rather than free text: the walks are known, and a typed name would not match
 * anything.
 *
 * Every write is the member's own session against RLS — a row can only be
 * written with profile_id = auth.uid(), and a file can only land in the
 * member's own storage folder.
 */
export function PhotoManager({
  profileId,
  photos,
  total,
}: {
  profileId: string;
  /** Only used to know whether anything is there to remove. */
  photos: PhotoRecord[];
  /** Everything they hold, not just this page — the limit counts all of it. */
  total: number;
}) {
  const { user } = useAuth();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState('');
  const [eventId, setEventId] = useState('');
  const [caption, setCaption] = useState('');

  const walks = allWalksNewestFirst();

  const isOwner = user?.id === profileId;
  if (!isOwner) return null;

  const remaining = Math.max(0, MAX_PHOTOS_PER_MEMBER - total);
  const full = remaining === 0;

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0 || !user) return;

    const chosen = Array.from(files);
    const rejected = chosen.find((file) => checkFile(file, 'photo'));
    if (rejected) {
      setError(checkFile(rejected, 'photo') ?? 'That file cannot be used.');
      return;
    }

    /* The trigger would refuse these anyway; saying so first saves the upload. */
    if (chosen.length > remaining) {
      setError(
        remaining === 0
          ? `That is ${MAX_PHOTOS_PER_MEMBER} photographs — the most a profile holds. Remove one to add another.`
          : `Room for ${remaining} more, and you chose ${chosen.length}.`,
      );
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setError('');
    setBusy(true);
    setProgress({ done: 0, total: chosen.length });

    for (const [index, file] of chosen.entries()) {
      /* uploadImage downscales to 2000px WebP first, and reports the
         dimensions of what it actually stored. */
      const uploaded = await uploadImage(file, 'photo', user.id);

      if (!uploaded.ok || !uploaded.path) {
        setError(uploaded.error ?? 'One of those did not upload.');
        break;
      }

      /* The walk carries the date, so taken_at is filled from it rather than
         asked for twice — and left null when no walk was chosen, because a
         date nobody supplied is not a date worth storing. */
      const walk = walks.find((w) => w.id === eventId);

      const { error: insertError } = await supabase.from('photos').insert({
        profile_id: user.id,
        storage_path: uploaded.path,
        width: uploaded.width ?? null,
        height: uploaded.height ?? null,
        caption: caption.trim() || null,
        location: walk?.area ?? null,
        taken_at: walk?.date ?? null,
        event_id: walk?.id ?? null,
      });

      if (insertError) {
        /* Do not leave an orphan file in the bucket. Awaited, so the rollback
           is as certain as the upload was. */
        await removeImageSurely('photo', uploaded.path);
        setError(photoInsertError(insertError.message));
        break;
      }

      setProgress({ done: index + 1, total: chosen.length });
    }

    setBusy(false);
    setProgress({ done: 0, total: 0 });
    /* The walk stays selected — somebody filing a morning's work uploads more
       than once. The caption does not: it described those photographs. */
    setCaption('');
    router.refresh();
  }

  return (
    <div className="border-l-2 border-border-strong bg-subtle py-5 pl-5 pr-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <p className="meta">Your archive</p>
        <span className="meta normal-case tracking-[0.08em]">
          {total} of {MAX_PHOTOS_PER_MEMBER} · compressed to under 200KB before upload
        </span>
      </div>

      {!full && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="field-label">Which walk</span>
            <select
              value={eventId}
              onChange={(event) => setEventId(event.target.value)}
              disabled={busy}
              className="mt-1.5 w-full border-b border-border bg-transparent py-2
                         text-[0.9375rem] focus:border-accent focus:outline-none"
            >
              <option value="">Not from a walk</option>
              {walks.map((walk) => (
                <option key={walk.id} value={walk.id}>
                  {walk.title} · {longDate(walk.date)}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="field-label">Caption</span>
            <input
              type="text"
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              disabled={busy}
              maxLength={280}
              placeholder="Kasba, 7:04 AM"
              className="mt-1.5 w-full border-b border-border bg-transparent py-2
                         text-[0.9375rem] placeholder:text-muted focus:border-accent
                         focus:outline-none"
            />
          </label>

          <p className="meta normal-case tracking-[0.08em] sm:col-span-2">
            Both are optional, and both apply to everything in this upload. The
            walk is what puts a photograph on that walk&rsquo;s page.
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy || full}
          aria-busy={busy}
          className="cta-solid disabled:opacity-60"
        >
          {busy
            ? progress.total > 1
              ? `Uploading ${progress.done + 1} of ${progress.total}`
              : 'Uploading'
            : full
              ? 'No room left'
              : 'Add photographs'}{' '}
          <span aria-hidden="true">→</span>
        </button>

        {photos.length > 0 && (
          <span className="meta normal-case tracking-[0.08em]">
            To remove one, hover it below and press ✕
          </span>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-4 font-mono text-micro uppercase text-accent">
          {error}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        multiple
        className="sr-only"
        onChange={(event) => {
          void handleFiles(event.target.files);
          event.target.value = '';
        }}
      />
    </div>
  );
}
