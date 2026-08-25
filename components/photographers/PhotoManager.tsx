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
 * One photograph at a time, with its own caption. Batch upload would be fewer
 * actions, but a caption is about one frame — shared across five it stops
 * being a caption and becomes a label, which is what `location` already is.
 *
 * Two fields sit above the button: which walk it came from, and the caption.
 * The walk is required — the archive is organised around walks, and a
 * photograph filed under none of them is one nobody can find again. The
 * caption stays optional. The walk stays selected between uploads, so filing a
 * morning's work is pick-file, caption, repeat.
 *
 * Required here and not in the database: `event_id` is nullable because every
 * photograph filed before the column existed has no walk and never will. This
 * is a rule about what gets added from now on, which is a rule the form can
 * hold — nothing is at stake if somebody bypasses it but a tidier archive.
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
  const [error, setError] = useState('');
  const [eventId, setEventId] = useState('');
  const [caption, setCaption] = useState('');

  const walks = allWalksNewestFirst();

  const isOwner = user?.id === profileId;
  if (!isOwner) return null;

  const remaining = Math.max(0, MAX_PHOTOS_PER_MEMBER - total);
  const full = remaining === 0;

  async function handleFile(files: FileList | null) {
    const file = files?.[0];
    if (!file || !user) return;

    const rejected = checkFile(file, 'photo');
    if (rejected) {
      setError(rejected);
      return;
    }

    /* Resolved before anything is uploaded, so a walk that cannot be found is
       a message rather than a file in the bucket waiting to be rolled back.
       The button is disabled without a selection; this is the belt to that
       brace, and what somebody sees if they arrive here another way. */
    const walk = walks.find((w) => w.id === eventId);
    if (!walk) {
      setError('Choose which walk this came from first.');
      return;
    }

    /* The trigger would refuse this anyway; saying so first saves the upload. */
    if (remaining === 0) {
      setError(
        `That is ${MAX_PHOTOS_PER_MEMBER} photographs — the most a profile holds. Remove one to add another.`,
      );
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setError('');
    setBusy(true);

    /* uploadImage downscales to 2000px WebP first, and reports the dimensions
       of what it actually stored. */
    const uploaded = await uploadImage(file, 'photo', user.id);

    if (!uploaded.ok || !uploaded.path) {
      setError(uploaded.error ?? 'That did not upload.');
      setBusy(false);
      return;
    }

    /* The walk carries the date and the area, so neither is asked for twice. */
    const { error: insertError } = await supabase.from('photos').insert({
      profile_id: user.id,
      storage_path: uploaded.path,
      width: uploaded.width ?? null,
      height: uploaded.height ?? null,
      caption: caption.trim() || null,
      location: walk.area,
      taken_at: walk.date,
      event_id: walk.id,
    });

    if (insertError) {
      /* Do not leave an orphan file in the bucket. Awaited, so the rollback is
         as certain as the upload was. */
      await removeImageSurely('photo', uploaded.path);
      setError(photoInsertError(insertError.message));
      setBusy(false);
      return;
    }

    setBusy(false);
    /* The walk stays selected — somebody filing a morning's work adds several,
       one after another. The caption does not: it described that photograph
       and the next one is a different frame. */
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
            <span className="field-label">Which walk *</span>
            <select
              value={eventId}
              onChange={(event) => setEventId(event.target.value)}
              disabled={busy}
              required
              aria-required="true"
              className="mt-1.5 w-full border-b border-border bg-transparent py-2
                         text-[0.9375rem] focus:border-accent focus:outline-none"
            >
              <option value="" disabled>
                Choose a walk
              </option>
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
            The walk is needed — it is what puts the photograph on that
            walk&rsquo;s page, and how anyone finds it again. The caption is
            yours to skip. Both belong to the one photograph you add next.
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy || full || !eventId}
          aria-busy={busy}
          className="cta-solid disabled:opacity-60"
        >
          {busy
            ? 'Uploading'
            : full
              ? 'No room left'
              : !eventId
                ? 'Choose a walk first'
                : 'Add a photograph'}{' '}
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
        className="sr-only"
        onChange={(event) => {
          void handleFile(event.target.files);
          event.target.value = '';
        }}
      />
    </div>
  );
}
