'use client';

import { useRef, useState } from 'react';
import { Avatar } from '@/components/navigation/Avatar';
import { useAuth } from '@/components/auth/AuthProvider';
import {
  ACCEPT_ATTRIBUTE,
  checkFile,
  pathFromPublicUrl,
  publicUrlFor,
  removeImage,
  uploadImage,
} from '@/lib/uploads';

type State = 'idle' | 'uploading' | 'done';

/**
 * The profile photograph. Uploads straight to Supabase Storage under the
 * member's own uid folder, then hands the resulting URL to the settings form
 * through a hidden input, so the picture and the rest of the profile are saved
 * by the same server action rather than by two competing writes.
 *
 * The old file is deleted after the new one lands — never before, so a failed
 * upload cannot leave somebody with no picture at all.
 */
export function AvatarUpload({
  initialUrl,
  fullName,
}: {
  initialUrl: string | null;
  fullName: string;
}) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);

  const [url, setUrl] = useState(initialUrl);
  const [preview, setPreview] = useState<string | null>(null);
  const [state, setState] = useState<State>('idle');
  const [error, setError] = useState('');

  async function handleFile(file: File | undefined) {
    if (!file || !user) return;

    const problem = checkFile(file, 'avatar');
    if (problem) {
      setError(problem);
      return;
    }

    setError('');
    setPreview(URL.createObjectURL(file));
    setState('uploading');

    const result = await uploadImage(file, 'avatar', user.id);
    if (!result.ok || !result.path) {
      setError(result.error ?? 'That did not upload.');
      setPreview(null);
      setState('idle');
      return;
    }

    const previousPath = pathFromPublicUrl(url, 'avatars');
    setUrl(publicUrlFor('avatars', result.path));
    setPreview(null);
    setState('done');

    /* Tidy up the file it replaced. Failing here is harmless. */
    if (previousPath) void removeImage('avatar', previousPath);
  }

  async function handleRemove() {
    const path = pathFromPublicUrl(url, 'avatars');
    setUrl(null);
    setPreview(null);
    setError('');
    setState('idle');
    if (path) void removeImage('avatar', path);
  }

  const shown = preview ?? url;

  return (
    <div className="mb-8 border-b border-border pb-8">
      <p className="field-label">Profile photograph</p>

      <div className="mt-1 flex flex-wrap items-center gap-5">
        <span className="relative">
          <Avatar src={shown} name={fullName} size={84} />
          {state === 'uploading' && (
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
            disabled={state === 'uploading'}
            className="font-mono text-micro uppercase text-foreground underline underline-offset-4 transition-colors hover:text-accent disabled:opacity-60"
          >
            {state === 'uploading' ? 'Uploading' : url ? 'Replace' : 'Upload a photograph'}
          </button>

          {url && state !== 'uploading' && (
            <button
              type="button"
              onClick={handleRemove}
              className="font-mono text-micro uppercase text-muted transition-colors hover:text-accent"
            >
              Remove
            </button>
          )}

          <span className="meta normal-case tracking-[0.06em]">JPEG, PNG, WebP or AVIF · up to 2MB</span>
        </div>
      </div>

      {error && (
        <p role="alert" className="mt-3 font-mono text-micro uppercase text-accent">
          {error}
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

      {/* What the server action actually reads. */}
      <input type="hidden" name="avatar_url" value={url ?? ''} />
    </div>
  );
}
