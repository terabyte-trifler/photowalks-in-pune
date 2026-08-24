'use client';

import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { Avatar } from '@/components/navigation/Avatar';
import { useAuth } from '@/components/auth/AuthProvider';
import { updateAvatar } from '@/app/(site)/settings/actions';
import {
  ACCEPT_ATTRIBUTE,
  checkFile,
  publicUrlFor,
  removeImageSurely,
  sweepAvatarFolder,
  uploadImage,
} from '@/lib/uploads';

type State = 'idle' | 'working';

/**
 * The profile photograph, which saves itself.
 *
 * It used to hand its URL to the profile form through a hidden field, so
 * "Replace" and "Remove" did nothing until somebody also pressed Save — and if
 * they never did, the file had already been deleted from storage while the
 * profile still pointed at it, leaving a permanently broken avatar. Buttons
 * labelled Replace and Remove have to actually replace and remove.
 *
 * So each action writes the profile row through `updateAvatar` and only then
 * tidies up the file it replaced. That order is the whole point: if the write
 * fails, the old photograph is still there and still referenced.
 */
export function AvatarUpload({
  initialUrl,
  fullName,
}: {
  initialUrl: string | null;
  fullName: string;
}) {
  const { user, refreshProfile } = useAuth();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [url, setUrl] = useState(initialUrl);
  const [preview, setPreview] = useState<string | null>(null);
  const [state, setState] = useState<State>('idle');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  async function handleFile(file: File | undefined) {
    if (!file || !user) return;

    const problem = checkFile(file, 'avatar');
    if (problem) {
      setError(problem);
      return;
    }

    setError('');
    setNote('');
    setPreview(URL.createObjectURL(file));
    setState('working');

    const uploaded = await uploadImage(file, 'avatar', user.id);
    if (!uploaded.ok || !uploaded.path) {
      setError(uploaded.error ?? 'That did not upload.');
      setPreview(null);
      setState('idle');
      return;
    }

    const nextUrl = publicUrlFor('avatars', uploaded.path);
    const saved = await updateAvatar(nextUrl);

    if (!saved.ok) {
      /* The row still points at the old photograph, so take the new file back
         out rather than leaving it behind unreferenced. */
      await removeImageSurely('avatar', uploaded.path);
      setError(saved.error ?? 'That did not save.');
      setPreview(null);
      setState('idle');
      return;
    }

    setUrl(nextUrl);
    setPreview(null);

    /* Only now is anything safe to delete: the row already points at the new
       file. Sweeping the whole folder rather than the one path this component
       happens to remember also clears anything an earlier save left behind —
       see the note on sweepAvatarFolder. Awaited, because a replaced
       photograph should not linger in the bucket. */
    await sweepAvatarFolder(user.id, uploaded.path);
    setNote('Saved');

    setState('idle');
    void refreshProfile();
    router.refresh();
  }

  async function handleRemove() {
    /* `user` is needed for the folder path, and there is nothing to remove
       without a URL — either missing means there is nothing to do. */
    if (!url || !user) return;

    setError('');
    setNote('');
    setState('working');

    const saved = await updateAvatar(null);
    if (!saved.ok) {
      setError(saved.error ?? 'That did not save.');
      setState('idle');
      return;
    }

    setUrl(null);
    setPreview(null);

    /* Removing the photograph has to take the file with it — and everything
       else in the folder, since after this nothing is meant to be kept. */
    const swept = await sweepAvatarFolder(user.id, null);
    setNote(swept > 0 ? 'Removed' : 'Removed — the file could not be deleted');

    setState('idle');
    void refreshProfile();
    router.refresh();
  }

  const shown = preview ?? url;
  const busy = state === 'working';

  return (
    <div className="mb-8 border-b border-border pb-8">
      <p className="field-label">Profile photograph</p>

      <div className="mt-1 flex flex-wrap items-center gap-5">
        <span className="relative">
          <Avatar src={shown} name={fullName} size={84} />
          {busy && (
            <span
              className="absolute inset-0 grid place-items-center rounded-full bg-[rgba(14,12,10,0.55)] font-mono text-micro uppercase text-[#F5F1EA]"
              role="status"
            >
              …
            </span>
          )}
        </span>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="font-mono text-micro uppercase text-foreground underline underline-offset-4 transition-colors hover:text-accent disabled:opacity-60"
          >
            {busy ? 'Saving' : url ? 'Change photograph' : 'Upload a photograph'}
          </button>

          {url && !busy && (
            <button
              type="button"
              onClick={handleRemove}
              className="font-mono text-micro uppercase text-muted transition-colors hover:text-accent"
            >
              Remove
            </button>
          )}

          <span className="meta normal-case tracking-[0.08em]">
            JPEG, PNG, WebP or AVIF · compressed for you · saved straight away
          </span>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-3 font-mono text-micro uppercase text-accent">
          {error}
        </p>
      )}
      {note && !error && (
        <p role="status" className="mt-3 font-mono text-micro uppercase text-muted">
          {note}
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        className="sr-only"
        onChange={(event) => {
          void handleFile(event.target.files?.[0]);
          /* Let the same file be chosen again after a failure. */
          event.target.value = '';
        }}
      />
    </div>
  );
}
