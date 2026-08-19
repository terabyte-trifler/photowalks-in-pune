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

import { MAX_PHOTOS_PER_MEMBER } from '@/lib/directory';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
export const ACCEPT_ATTRIBUTE = ACCEPTED_TYPES.join(',');

/** What we accept from the file picker, before downscaling. */
export const LIMITS = {
  avatar: 2 * 1024 * 1024,
  photo: 10 * 1024 * 1024,
} as const;

/**
 * What we actually store. A camera original is twenty to forty times larger
 * than anything a browser will display: at 500 members × 20 photographs, ten
 * megabytes each is ~98GB of storage and the same again in egress, against a
 * free tier of one gigabyte. Two thousand pixels of WebP is around 300KB and
 * is still more resolution than the grid ever asks for.
 *
 * It is also much faster to upload on mobile data, which is how most of these
 * photographs will arrive.
 */
const MAX_EDGE = { avatar: 512, photo: 2000 } as const;
const QUALITY = { avatar: 0.85, photo: 0.82 } as const;

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

export interface PreparedImage {
  blob: Blob;
  width: number;
  height: number;
  extension: string;
  contentType: string;
}

/** Does this browser actually produce WebP from a canvas? Safari lagged. */
let webpSupport: boolean | null = null;
function canEncodeWebp(): boolean {
  if (webpSupport !== null) return webpSupport;
  try {
    const probe = document.createElement('canvas');
    probe.width = 1;
    probe.height = 1;
    webpSupport = probe.toDataURL('image/webp').startsWith('data:image/webp');
  } catch {
    webpSupport = false;
  }
  return webpSupport;
}

const toBlob = (canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> =>
  new Promise((resolve) => canvas.toBlob(resolve, type, quality));

/**
 * Resize down to MAX_EDGE and re-encode, in the browser, before anything is
 * uploaded. Returns the original untouched when shrinking it would not help —
 * a small WebP that is already under the limit is left exactly as it is.
 *
 * `imageOrientation: 'from-image'` matters more than it looks: without it a
 * photograph taken in portrait on a phone is drawn to the canvas sideways,
 * because the rotation lives in EXIF that the canvas would otherwise discard.
 */
export async function prepareImage(file: File, kind: UploadKind): Promise<PreparedImage> {
  const edge = MAX_EDGE[kind];
  const fallback = async (): Promise<PreparedImage> => {
    const size = (await readDimensions(file)) ?? { width: 0, height: 0 };
    return {
      blob: file,
      width: size.width,
      height: size.height,
      extension: (file.name.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg',
      contentType: file.type,
    };
  };

  if (typeof createImageBitmap !== 'function') return fallback();

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return fallback();
  }

  const longest = Math.max(bitmap.width, bitmap.height);
  const scale = longest > edge ? edge / longest : 1;
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) {
    bitmap.close();
    return fallback();
  }
  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const useWebp = canEncodeWebp();
  const type = useWebp ? 'image/webp' : 'image/jpeg';
  const blob = await toBlob(canvas, type, QUALITY[kind]);

  /* Re-encoding can occasionally produce something larger than the original —
     a small, already-optimised file, for instance. Keep whichever is smaller. */
  if (!blob || blob.size >= file.size) return fallback();

  return {
    blob,
    width,
    height,
    extension: useWebp ? 'webp' : 'jpg',
    contentType: type,
  };
}

export interface UploadResult {
  ok: boolean;
  /** Path within the bucket, e.g. `<uid>/1712345678-a1b2c3.webp`. */
  path?: string;
  /** Dimensions of what was actually stored, after downscaling. */
  width?: number;
  height?: number;
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

  const prepared = await prepareImage(file, kind);
  const path = `${ownerId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${prepared.extension}`;

  const { error } = await supabase.storage.from(BUCKET[kind]).upload(path, prepared.blob, {
    cacheControl: '31536000',
    upsert: false,
    contentType: prepared.contentType,
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

  return { ok: true, path, width: prepared.width, height: prepared.height };
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

/**
 * The photos_enforce_limit trigger raises a message the browser would
 * otherwise show raw. Turn it into a sentence; leave anything else alone.
 */
export function photoInsertError(message: string | undefined): string {
  if (message?.includes('photo_limit_reached')) {
    return `That is ${MAX_PHOTOS_PER_MEMBER} photographs — the most a profile holds. Remove one to add another.`;
  }
  return 'That did not save. Try again in a moment.';
}
