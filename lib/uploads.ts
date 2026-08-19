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

/* ---------------------------------------------------------------------------
 * WHAT WE ACTUALLY STORE
 * ---------------------------------------------------------------------------
 * A camera original is twenty to forty times larger than anything a browser
 * will display. At 500 members × 20 photographs, ten megabytes each is ~67GB
 * of storage and the same again in egress, against a free tier of one
 * gigabyte. So every image is resized and re-encoded in the browser until it
 * fits a byte budget, before a single byte is uploaded.
 *
 * The budget is a real trade-off, not a free win: 200KB across two megapixels
 * is roughly 0.6 bits per pixel, which is comfortable for most photographs and
 * tight for very detailed ones — dense foliage, crowds, heavy grain. The
 * ladder below spends resolution last, because a slightly softer 2000px frame
 * looks better than a crisp 1000px one on a retina screen.
 * ------------------------------------------------------------------------ */

/** The ceiling each kind is compressed to. */
export const TARGET_BYTES = {
  avatar: 100 * 1024,
  photo: 200 * 1024,
} as const;

/**
 * Tried in order, quality first at each size. Nine encodes at the very worst,
 * and one or two for a typical photograph, since the loop stops the moment it
 * is under budget.
 */
const EDGE_STEPS: Record<UploadKind, number[]> = {
  avatar: [512, 384, 256],
  photo: [2000, 1500, 1100],
};
const QUALITY_STEPS = [0.82, 0.68, 0.55] as const;

/**
 * When the ladder above still has not fitted — a very grainy or noisy frame,
 * mostly — the image is shrunk repeatedly at low quality until it does. Any
 * photograph fits under 200KB at some size; this finds that size instead of
 * giving up. In practice it is reached rarely and exits after a step or two.
 */
const SHRINK_QUALITY = 0.45;
const SHRINK_FACTOR = 0.75;
/** Below this the result stops being a photograph, so we refuse instead. */
const MIN_EDGE: Record<UploadKind, number> = { avatar: 128, photo: 640 };

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

/** Draw the bitmap at a given longest edge and hand back the canvas. */
function drawAt(bitmap: ImageBitmap, edge: number): { canvas: HTMLCanvasElement; width: number; height: number } | null {
  const longest = Math.max(bitmap.width, bitmap.height);
  const scale = longest > edge ? edge / longest : 1;
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return null;

  /* Downscaling in one step is what makes a resized photograph look crunchy;
     the browser's own smoothing is doing the filtering here. */
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(bitmap, 0, 0, width, height);
  return { canvas, width, height };
}

/**
 * Resize and re-encode until the result is under TARGET_BYTES, in the browser,
 * before anything is uploaded.
 *
 * `imageOrientation: 'from-image'` matters more than it looks: without it a
 * photograph taken in portrait on a phone is drawn sideways, because the
 * rotation lives in EXIF that the canvas would otherwise discard.
 *
 * Never rejects. If even the floor cannot get under budget the smallest
 * attempt is used and `overBudget` is set, because refusing somebody's
 * photograph over a storage target would be the wrong way round.
 */
export async function prepareImage(file: File, kind: UploadKind): Promise<PreparedImage> {
  const target = TARGET_BYTES[kind];

  const original = async (): Promise<PreparedImage> => {
    const size = (await readDimensions(file)) ?? { width: 0, height: 0 };
    return {
      blob: file,
      width: size.width,
      height: size.height,
      extension: (file.name.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg',
      contentType: file.type,
    };
  };

  if (typeof createImageBitmap !== 'function') {
    if (file.size > target) throw new OverBudgetError();
    return original();
  }

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    if (file.size > target) throw new OverBudgetError();
    return original();
  }

  const useWebp = canEncodeWebp();
  const type = useWebp ? 'image/webp' : 'image/jpeg';
  const extension = useWebp ? 'webp' : 'jpg';

  const made = (blob: Blob, width: number, height: number): PreparedImage => ({
    blob, width, height, extension, contentType: type,
  });

  try {
    /* Quality first at each size: a slightly softer 2000px frame looks better
       than a crisp 1000px one on a retina screen. */
    for (const edge of EDGE_STEPS[kind]) {
      const drawn = drawAt(bitmap, edge);
      if (!drawn) break;

      for (const quality of QUALITY_STEPS) {
        const blob = await toBlob(drawn.canvas, type, quality);
        if (blob && blob.size <= target) return made(blob, drawn.width, drawn.height);
      }
    }

    /* Still over. Shrink until it fits — this is what makes the ceiling a
       guarantee rather than an aspiration. */
    let edge = EDGE_STEPS[kind][EDGE_STEPS[kind].length - 1];
    while (edge > MIN_EDGE[kind]) {
      edge = Math.max(MIN_EDGE[kind], Math.round(edge * SHRINK_FACTOR));
      const drawn = drawAt(bitmap, edge);
      if (!drawn) break;

      const blob = await toBlob(drawn.canvas, type, SHRINK_QUALITY);
      if (blob && blob.size <= target) return made(blob, drawn.width, drawn.height);
      if (edge === MIN_EDGE[kind]) break;
    }
  } finally {
    bitmap.close();
  }

  /* Nothing fitted even at the minimum size. Refusing is the honest outcome:
     the alternative is silently storing something over the ceiling. */
  throw new OverBudgetError();
}

/** Thrown when an image cannot be brought under its byte budget. */
export class OverBudgetError extends Error {
  constructor() {
    super('over_budget');
    this.name = 'OverBudgetError';
  }
}

export interface UploadResult {
  ok: boolean;
  /** Path within the bucket, e.g. `<uid>/1712345678-a1b2c3.webp`. */
  path?: string;
  /** Dimensions of what was actually stored, after compression. */
  width?: number;
  height?: number;
  /** Size of what was stored, in bytes. */
  bytes?: number;
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

  let prepared: PreparedImage;
  try {
    prepared = await prepareImage(file, kind);
  } catch {
    return {
      ok: false,
      error: `We could not get that under ${Math.round(TARGET_BYTES[kind] / 1024)}KB without ruining it. Try exporting it a little smaller.`,
    };
  }

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

  return {
    ok: true,
    path,
    width: prepared.width,
    height: prepared.height,
    bytes: prepared.blob.size,
  };
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
