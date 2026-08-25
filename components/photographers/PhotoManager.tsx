'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
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

/** Chosen deliberately, and not the same thing as having chosen nothing. */
const NO_WALK = 'none';

/**
 * Adding and removing your own photographs.
 *
 * One photograph at a time, with its own caption. Batch upload would be fewer
 * actions, but a caption is about one frame — shared across five it stops
 * being a caption and becomes a label, which is what `location` already is.
 *
 * Two fields sit above the button: which walk it came from, and the caption.
 *
 * Answering the walk is required; the answer may be "not from a walk". The
 * distinction is the point — the field opens on nothing selected, so filing a
 * photograph outside a walk is a decision somebody made rather than the
 * default they walked past. Most photographs here come from a walk, and the
 * ones that do should say so, because that is how anybody finds them again.
 *
 * The caption stays optional. The walk stays selected between uploads, so
 * filing a morning's work is pick-file, caption, repeat.
 *
 * ---- CHOOSE, THEN LOOK, THEN PUSH ------------------------------------------
 * Picking a file does not upload it. It shows the frame and waits, because a
 * caption is written about a photograph somebody is looking at — asking for
 * one before it is on screen gets you the filename or nothing.
 *
 * The preview is an object URL: a handle on the file already on disk, not a
 * copy of it in memory, and one at a time. It is revoked the moment the
 * photograph is pushed, discarded, or this unmounts, so nothing is held after
 * it stops being looked at.
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
  /* Distinct from '' (nothing chosen yet), which is what the button waits on. */
  const [eventId, setEventId] = useState('');
  const [caption, setCaption] = useState('');
  /* Chosen and being looked at, not yet uploaded. */
  const [pending, setPending] = useState<{ file: File; url: string } | null>(null);

  /* Last resort: navigating away with a frame on screen should not leak its
     handle. Everywhere else revokes as it clears. */
  useEffect(() => () => {
    if (pending) URL.revokeObjectURL(pending.url);
  }, [pending]);

  const walks = allWalksNewestFirst();

  const isOwner = user?.id === profileId;
  if (!isOwner) return null;

  const remaining = Math.max(0, MAX_PHOTOS_PER_MEMBER - total);
  const full = remaining === 0;

  /** Picking a file only shows it. Nothing leaves the machine until Push. */
  function chooseFile(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;

    const rejected = checkFile(file, 'photo');
    if (rejected) {
      setError(rejected);
      return;
    }

    if (remaining === 0) {
      setError(
        `That is ${MAX_PHOTOS_PER_MEMBER} photographs — the most a profile holds. Remove one to add another.`,
      );
      return;
    }

    setError('');
    setPending((current) => {
      /* One at a time: whatever was on screen is let go before the next. */
      if (current) URL.revokeObjectURL(current.url);
      return { file, url: URL.createObjectURL(file) };
    });
  }

  /** Put the frame back down without uploading it. */
  function discard() {
    setPending((current) => {
      if (current) URL.revokeObjectURL(current.url);
      return null;
    });
    setError('');
  }

  async function pushToGallery() {
    if (!pending || !user || busy) return;

    /* The button is disabled until something is chosen; this is the belt to
       that brace, and what somebody sees if they arrive here another way. */
    if (!eventId) {
      setError('Choose which walk this came from, or say it is not from one.');
      return;
    }

    const walk = eventId === NO_WALK ? null : walks.find((w) => w.id === eventId);
    if (eventId !== NO_WALK && !walk) {
      setError('That walk is no longer listed. Choose another.');
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;

    setError('');
    setBusy(true);

    /* uploadImage downscales to 2000px WebP first, and reports the dimensions
       of what it actually stored. */
    const uploaded = await uploadImage(pending.file, 'photo', user.id);

    if (!uploaded.ok || !uploaded.path) {
      setError(uploaded.error ?? 'That did not upload.');
      setBusy(false);
      return;
    }

    /* A walk carries the date and the area, so neither is asked for twice.
       Without one all three stay null — a date nobody supplied is not a date
       worth storing. */
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
      /* Do not leave an orphan file in the bucket. Awaited, so the rollback is
         as certain as the upload was. */
      await removeImageSurely('photo', uploaded.path);
      setError(photoInsertError(insertError.message));
      setBusy(false);
      return;
    }

    setBusy(false);
    discard();
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

      {pending && (
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start">
          {/* An object URL, so this is the file on disk rather than a copy of
              it — and next/image cannot optimise a blob, nor should it: the
              point is to see exactly what is about to be sent. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={pending.url}
            alt="The photograph you are about to add"
            className="h-40 w-full flex-none border border-border object-cover sm:w-56"
          />
          <div className="min-w-0">
            <p className="meta">Ready to push</p>
            <p className="mt-1.5 truncate text-[0.9375rem] text-foreground-soft">
              {pending.file.name}
            </p>
            <p className="meta mt-1 normal-case tracking-[0.08em]">
              Caption it below while you can see it. It is resized and
              compressed on the way up, so what lands is a fraction of this.
            </p>
          </div>
        </div>
      )}

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
              <option value={NO_WALK}>Not from a walk</option>
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
            Naming the walk is what puts the photograph on that walk&rsquo;s
            page, and how anyone finds it again — but &ldquo;not from a
            walk&rdquo; is a fair answer. The caption is yours to skip.
          </p>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        {pending ? (
          <>
            <button
              type="button"
              onClick={() => void pushToGallery()}
              disabled={busy || !eventId}
              aria-busy={busy}
              className="cta-solid disabled:opacity-60"
            >
              {busy ? 'Pushing' : !eventId ? 'Choose a walk first' : 'Push to gallery'}{' '}
              <span aria-hidden="true">→</span>
            </button>

            <button
              type="button"
              onClick={discard}
              disabled={busy}
              className="cta disabled:opacity-60"
            >
              Choose another
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy || full}
            className="cta-solid disabled:opacity-60"
          >
            {full ? 'No room left' : 'Add a photograph'} <span aria-hidden="true">→</span>
          </button>
        )}

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
          chooseFile(event.target.files);
          event.target.value = '';
        }}
      />
    </div>
  );
}
