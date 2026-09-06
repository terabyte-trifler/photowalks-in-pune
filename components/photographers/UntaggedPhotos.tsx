'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { allWalksNewestFirst } from '@/data/events';
import { photoUrl } from '@/lib/directory';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import type { PhotoRecord } from '@/lib/supabase/types';
import { cn } from '@/lib/utils';

/* ============================================================================
 * WHICH WALK DID THESE COME FROM
 * ----------------------------------------------------------------------------
 * The upload form has asked for a walk since the event_id column existed, and
 * every photograph filed since then carries one. The 115 that predate it do
 * not, and there was no way to say so afterwards — the database has granted
 * UPDATE on event_id all along, and no screen ever offered it.
 *
 * That gap is what keeps the place pages empty. A photograph with no walk
 * appears on its owner's profile and nowhere else: not on the walk it was made
 * on, not on /places/mandai, and not in the ImageGallery structured data that
 * credits the person who made it.
 *
 * WHY THIS IS BULK AND NOT A CONTROL PER FRAME
 * A control on each photograph is the obvious build and the wrong one. The
 * people with untagged photographs have sixteen to twenty each, and almost all
 * of one person's came from one or two mornings — so per-frame tagging is
 * twenty interactions to express one fact. Nobody finishes that, and a feature
 * nobody finishes leaves the pages just as empty as no feature at all.
 *
 * So: select several, name the walk once, apply. The common case is "select
 * all, choose the walk", which is two clicks for twenty photographs.
 *
 * The panel disappears when there is nothing untagged left. It is a migration
 * aid with an end, not a permanent fixture.
 * ========================================================================== */

/** Mirrors what PhotoManager writes, so a retagged row is indistinguishable. */
const NO_WALK = 'none';

export function UntaggedPhotos({ photos }: { photos: PhotoRecord[] }) {
  const router = useRouter();
  const walks = useMemo(() => allWalksNewestFirst(), []);

  const untagged = useMemo(() => photos.filter((photo) => !photo.event_id), [photos]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [eventId, setEventId] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(0);

  if (untagged.length === 0) return null;

  const allSelected = selected.size === untagged.length;

  const toggle = (id: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setError('');
  };

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(untagged.map((photo) => photo.id)));
    setError('');
  };

  async function apply() {
    if (selected.size === 0) {
      setError('Choose at least one photograph.');
      return;
    }
    if (!eventId) {
      setError('Choose which walk these came from.');
      return;
    }

    const supabase = getSupabaseBrowserClient();
    if (!supabase) {
      setError('Not connected. Try again in a moment.');
      return;
    }

    setBusy(true);
    setError('');

    const walk = eventId === NO_WALK ? null : walks.find((candidate) => candidate.id === eventId);
    if (eventId !== NO_WALK && !walk) {
      setError('That walk is no longer listed. Choose another.');
      setBusy(false);
      return;
    }

    /* The same three columns PhotoManager sets on upload, so a photograph
       tagged here is indistinguishable from one filed correctly the first
       time. Row Level Security scopes this to the caller's own rows — the
       `in` cannot reach anybody else's photographs even if the ids were
       tampered with. */
    const { error: updateError } = await supabase
      .from('photos')
      .update({
        event_id: walk?.id ?? null,
        location: walk?.area ?? null,
        taken_at: walk?.date ?? null,
      })
      .in('id', [...selected]);

    if (updateError) {
      setError('That did not save. Try again in a moment.');
      setBusy(false);
      return;
    }

    setSaved(selected.size);
    setSelected(new Set());
    setEventId('');
    setBusy(false);
    router.refresh();
  }

  return (
    <section
      aria-labelledby="untagged-title"
      className="border-l-2 border-accent bg-subtle py-5 pl-5 pr-4"
    >
      <p className="meta">Which walk?</p>
      <h2 id="untagged-title" className="display mt-2 text-[clamp(1.15rem,2.4vw,1.5rem)]">
        {untagged.length} {untagged.length === 1 ? 'photograph has' : 'photographs have'} no walk
      </h2>
      <p className="mt-2 max-w-[56ch] text-body text-foreground-soft">
        These were filed before we started asking which walk a photograph came from. Naming the walk
        puts them on that walk&rsquo;s page and on the page for the place it went to, credited to
        you.
      </p>

      {saved > 0 && (
        <p role="status" className="mt-3 text-body text-foreground">
          {saved} {saved === 1 ? 'photograph' : 'photographs'} filed.
        </p>
      )}

      {/* ---- the frames, as a picker ---------------------------------- */}
      <div className="mt-5 flex flex-wrap gap-2">
        {untagged.map((photo) => {
          const isOn = selected.has(photo.id);
          return (
            <button
              key={photo.id}
              type="button"
              onClick={() => toggle(photo.id)}
              aria-pressed={isOn}
              aria-label={
                isOn ? 'Selected. Press to deselect.' : 'Not selected. Press to select.'
              }
              className={cn(
                'relative h-16 w-16 overflow-hidden border-2 transition-opacity duration-200',
                isOn ? 'border-accent' : 'border-transparent opacity-60 hover:opacity-100',
              )}
            >
              <Image
                src={photoUrl(photo)}
                alt=""
                fill
                sizes="64px"
                className="object-cover"
                unoptimized
              />
              {isOn && (
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 right-0 bg-accent px-1 font-mono text-micro text-background"
                >
                  ✓
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ---- what to do with them -------------------------------------- */}
      <div className="mt-5 flex flex-wrap items-end gap-3">
        <button type="button" onClick={toggleAll} className="cta">
          {allSelected ? 'Clear selection' : `Select all ${untagged.length}`}
        </button>

        <label className="min-w-[16rem] flex-1">
          <span className="field-label">Which walk</span>
          <select
            value={eventId}
            onChange={(event) => {
              setEventId(event.target.value);
              setError('');
            }}
            className="field-input"
            disabled={busy}
          >
            <option value="">Choose a walk</option>
            {walks.map((walk) => (
              <option key={walk.id} value={walk.id}>
                {walk.title}
              </option>
            ))}
            <option value={NO_WALK}>Not from a walk</option>
          </select>
        </label>

        <button type="button" onClick={apply} disabled={busy} className="cta-solid">
          {busy
            ? 'Filing…'
            : `File ${selected.size > 0 ? selected.size : ''} ${
                selected.size === 1 ? 'photograph' : 'photographs'
              }`.replace(/\s+/g, ' ')}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-body text-accent">
          {error}
        </p>
      )}
    </section>
  );
}
