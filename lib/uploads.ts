'use client';

/* ============================================================================
 * IMAGE UPLOADS
 * ----------------------------------------------------------------------------
 * Everything goes to Supabase Storage from the browser with the member's own
 * session. Nothing here is trusted:
 *
 *   - the bucket rejects the wrong MIME type and anything over its size limit
 *   - the storage policy rejects a path outside the member's own folder
 *
 * The checks below exist so somebody who picks a 40MB RAW file is told so
 * immediately rather than after a long upload that the server then refuses.
 * They are a courtesy, not the guard. See migration 0003.
 * ========================================================================== */

import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
export const ACCEPT_ATTRIBUTE = ACCEPTED_TYPES.join(',');

export const LIMITS = {
  avatar: 2 * 1024 * 1024,
  photo: 10 * 1024 * 1024,
} as const;

export type UploadKind = keyof typeof LIMITS;

const BUCKET: Record<UploadKind, 'avatars' | 'photos'> = {
  avatar: 'avatars',
  photo: 'photos',
};

const readableSize = (bytes: number): string =>
  bytes >= 1024 * 1024 ? `${Math.round(bytes / (1024 * 1024))}MB` : `${Math.round(bytes / 1024)}KB`;

/** Human-readable reason, or undefined when the file is fine. */
export function checkFile(file: File, kind: UploadKind): string | undefined {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return 'JPEG, PNG, WebP or AVIF, please — that looks like something else.';
  }
  if (file.size > LIMITS[kind]) {
    return `That file is ${readableSize(file.size)}. The limit is ${readableSize(LIMITS[kind])}.`;
  }
  if (file.size === 0) return 'That file is empty.';
  return undefined;
}

/** Natural dimensions, so the grid can reserve the right box before it loads. */
export function readDimensions(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
      URL.revokeObjectURL(url);
    };
    image.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    image.src = url;
  });
}

export interface UploadResult {
  ok: boolean;
  /** Path within the bucket, e.g. `<uid>/1712345678-frame.jpg`. */
  path?: string;
  error?: string;
}

/**
 * Upload one file into the member's own folder. The uid prefix is what the
 * storage policy checks, so it is not optional and not decorative.
 */
export async function uploadImage(
  file: File,
  kind: UploadKind,
  ownerId: string,
): Promise<UploadResult> {
  const problem = checkFile(file, kind);
  if (problem) return { ok: false, error: problem };

  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { ok: false, error: 'Uploads are not connected on this build.' };

  const extension = (file.name.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
  const path = `${ownerId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension || 'jpg'}`;

  const { error } = await supabase.storage.from(BUCKET[kind]).upload(path, file, {
    cacheControl: '31536000',
    upsert: false,
    contentType: file.type,
  });

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes('exceeded') || message.includes('too large')) {
      return { ok: false, error: `That file is over the ${readableSize(LIMITS[kind])} limit.` };
    }
    if (message.includes('mime') || message.includes('type')) {
      return { ok: false, error: 'That file type is not allowed.' };
    }
    if (message.includes('policy') || message.includes('unauthorized')) {
      return { ok: false, error: 'Your session has expired. Log in again to upload.' };
    }
    return { ok: false, error: 'That upload did not go through. Try again in a moment.' };
  }

  return { ok: true, path };
}

/** Remove a file. The policy limits this to the member's own folder. */
export async function removeImage(kind: UploadKind, path: string): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return false;
  const { error } = await supabase.storage.from(BUCKET[kind]).remove([path]);
  return !error;
}

/** The stored `avatar_url` is a full URL; storage needs the path inside it. */
export function pathFromPublicUrl(url: string | null, bucket: 'avatars' | 'photos'): string | null {
  if (!url) return null;
  const marker = `/storage/v1/object/public/${bucket}/`;
  const index = url.indexOf(marker);
  return index === -1 ? null : url.slice(index + marker.length);
}

export function publicUrlFor(bucket: 'avatars' | 'photos', path: string): string {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return path;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}
