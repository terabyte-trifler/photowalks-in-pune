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
import { CURRENT_LADDER, VARIANT_LADDERS, parseVariantPath, variantPath, variantWidths } from '@/lib/images';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

/**
 * What may be CHOSEN. HEIC is on the list because it is converted in the
 * browser before anything leaves the machine — see prepareChoice.
 */
export const ACCEPTED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
  'image/heic',
];

/**
 * What may be STORED. The buckets refuse anything else (migration 0003), and
 * HEIC is deliberately absent: it is converted on the way in, never kept.
 */
export const STORABLE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

/**
 * Deliberately the widest possible filter.
 *
 * A list of concrete types here is what stopped photographs being selectable on
 * Android at all: the picker matches the attribute against whatever the gallery
 * provider claims a file is, and Android's providers routinely claim nothing
 * useful — so an explicit list greys out real photographs and the member cannot
 * even choose one. `image/*` is the one value every picker on every platform
 * understands.
 *
 * Widening it costs nothing, because this attribute was never the check. The
 * decoder is: anything that cannot be drawn is refused in prepareChoice, with a
 * message naming the reason. A file picker is a convenience, not a gate.
 */
export const ACCEPT_ATTRIBUTE = 'image/*';

/**
 * The largest file that may be chosen.
 *
 * Not a storage limit — nothing this large is ever uploaded, because everything
 * is compressed to TARGET_BYTES first. It is a memory limit: decoding costs
 * width x height x 4 bytes regardless of how well the file compressed, so a
 * very large image can hang or crash the tab before any of this code runs.
 *
 * 100MB is far above any real camera JPEG, so nothing anybody actually
 * photographed is turned away — it draws the line where files stop being
 * photographs, and it costs one comparison rather than a failed decode.
 */
export const MAX_FILE_BYTES = 100 * 1024 * 1024;

/**
 * Kept only so `UploadKind` has something to key off, and as the sizes quoted
 * in copy. Nothing is rejected for being larger — see checkFile.
 */
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

/**
 * What the narrower ladder rungs are encoded at. Higher than anything the
 * budget search settles on, and it costs nothing: a 640px frame at 0.8 is
 * tens of kilobytes. These are the files most visitors actually download —
 * a grid thumbnail, an avatar — so they are the wrong place to save bytes.
 */
const RUNG_QUALITY = 0.8;

export type UploadKind = keyof typeof LIMITS;

const BUCKET: Record<UploadKind, 'avatars' | 'photos'> = {
  avatar: 'avatars',
  photo: 'photos',
};

const readableSize = (bytes: number): string =>
  bytes >= 1024 * 1024 ? `${Math.round(bytes / (1024 * 1024))}MB` : `${Math.round(bytes / 1024)}KB`;

/**
 * Human-readable reason, or undefined when the file can be used.
 *
 * Note what is *not* checked: size. However large the original, it is
 * compressed to fit rather than turned away — somebody photographing on a
 * good camera should not have to resize their own files before they can
 * share one. The only refusal left is a file that is not an image at all,
 * which no amount of compression can fix.
 */
/**
 * A refusal whose message is written to be shown to the member as-is.
 *
 * Every one of these is a dead end with a cause worth naming. "Could not be
 * read" for all of them is what made the last round of reports impossible to
 * act on — the same sentence covered a HEIC decoder that failed to load, a
 * damaged file, and a format the device does not support, which want three
 * different responses from the person holding the phone.
 */
export class UploadRefusal extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UploadRefusal';
  }
}

export class UndecodableImageError extends UploadRefusal {
  constructor() {
    super(
      'This device could not read that photograph. It may be in a format this browser does not support, or the file may be incomplete.',
    );
    this.name = 'UndecodableImageError';
  }
}

export class UnreadableFileError extends UploadRefusal {
  constructor() {
    super(
      'That photograph could not be read from this device. If it is still syncing from Google Photos or iCloud, open it in the gallery first so it downloads, then try again.',
    );
    this.name = 'UnreadableFileError';
  }
}

/**
 * Conversion failed, and which way it failed decides what the member should do
 * about it — resize, sign in again, or simply try once more.
 */
const HEIC_MESSAGE: Record<string, string> = {
  too_large:
    'That HEIC photograph is over 4MB, which is too large to convert. Sharing it from Photos, or saving it as JPEG first, will work.',
  unauthorised: 'Your session has expired. Log in again and try that photograph once more.',
  offline:
    'That photograph could not be converted — the connection dropped. Try again in a moment.',
};

export class HeicConversionError extends UploadRefusal {
  readonly reason: string;
  constructor(reason = 'unknown') {
    super(
      HEIC_MESSAGE[reason] ??
        'That HEIC photograph could not be converted. Sharing it from Photos, or saving it as JPEG, will work.',
    );
    this.name = 'HeicConversionError';
    this.reason = reason;
  }
}

/**
 * ISO base-media brands, which is how AVIF and HEIC identify themselves. Both
 * are `ftyp` boxes and differ only in the brand that follows, so the same four
 * bytes decide between a format every browser reads and one Chrome cannot read
 * at all.
 *
 * `mif1` and `msf1` are the generic HEIF brands. Some AVIF encoders write one
 * of those as the MAJOR brand and name `avif` only in the compatible list —
 * which is why the whole brand region is searched, and why avif is tested
 * first. Testing heic first would misfile those as unreadable.
 */
const AVIF_BRANDS = /avif|avis/;
const HEIC_BRANDS = /heic|heix|heim|heis|hevc|hevx|mif1|msf1/;

/**
 * What the first bytes say the file actually is, or null for anything not
 * recognised.
 *
 * `file.type` is not evidence. The browser fills it from the operating system,
 * which fills it from the extension — so a HEIC photograph renamed `.jpg`,
 * which is what a routine phone-to-desktop transfer produces, arrives claiming
 * `image/jpeg`. It then passes any check written against that claim and fails
 * in the one place nobody is watching: the decoder. What the member sees is a
 * broken preview with no explanation, because nothing in the app ever
 * disagreed with the file.
 *
 * Thirty-two bytes covers every signature here: JPEG, PNG and WebP start with
 * theirs, and the ISO base-media formats put `ftyp` at offset 4 with the brands
 * immediately after.
 */
/**
 * Returned when the bytes could not be read at all. Deliberately not a MIME
 * type: nothing downstream will mistake it for one, STORABLE_TYPES excludes it
 * so it can never be uploaded as-is, and the caller can tell "unreadable" from
 * "unrecognised" — which want different sentences.
 */
export const UNREADABLE = 'unreadable';

export async function sniffImageType(file: File): Promise<string | null> {
  /* ---------------------------------------------------------------------
   * A failure here is REPORTED, not thrown.
   *
   * This read is wanted, not required: its only job is to spot HEIC. Making it
   * fatal is what turned a maybe into a no — an Android 10 phone whose
   * arrayBuffer() refused 32 bytes was told its photograph could not be
   * opened, when the renderer and the decoder read files by a different
   * internal path entirely and would very likely have managed it.
   *
   * Tried twice, because these refusals are frequently transient: a content://
   * handle that a provider is still settling answers on the second ask.
   * ------------------------------------------------------------------- */
  let head: Uint8Array | null = null;
  for (let attempt = 0; attempt < 2 && head === null; attempt += 1) {
    try {
      head = new Uint8Array(await file.slice(0, 32).arrayBuffer());
    } catch {
      if (attempt === 0) await new Promise((r) => setTimeout(r, 120));
    }
  }
  if (head === null) return UNREADABLE;
  if (head.length < 12) return null;

  const ascii = (from: number, to: number) =>
    String.fromCharCode(...head.subarray(from, Math.min(to, head.length)));

  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'image/jpeg';
  if (ascii(0, 8) === '\x89PNG\r\n\x1a\n') return 'image/png';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WEBP') return 'image/webp';
  if (ascii(0, 3) === 'GIF') return 'image/gif';
  if (ascii(0, 2) === 'BM') return 'image/bmp';
  if (ascii(0, 4) === 'II*\x00' || ascii(0, 4) === 'MM\x00*') return 'image/tiff';

  if (ascii(4, 8) === 'ftyp') {
    const brands = ascii(8, head.length);
    if (AVIF_BRANDS.test(brands)) return 'image/avif';
    if (HEIC_BRANDS.test(brands)) return 'image/heic';
  }

  /* Not images, and recognised only so the refusal can say what the file
     actually is. Every one of these has turned up in a Downloads folder
     wearing a .jpg or .png name. */
  if (ascii(0, 4) === '%PDF') return 'application/pdf';
  if (ascii(0, 2) === 'PK') return 'application/zip';
  if (ascii(0, 4) === 'book') return 'application/x-apple-alias';
  const start = ascii(0, 16).trim().toLowerCase();
  if (start.startsWith('<!doctype') || start.startsWith('<html') || start.startsWith('<?xml')) {
    return 'text/html';
  }

  return null;
}

/** What to call a non-image in a refusal, so the message is about their file. */
const NOT_AN_IMAGE: Record<string, string> = {
  'application/pdf': 'a PDF',
  'application/zip': 'a zip archive',
  'application/x-apple-alias': 'a Finder alias — a pointer to a file, not the file',
  'text/html': 'a web page',
};

export async function checkFile(
  file: File,
  _kind: UploadKind,
  known?: string | null,
): Promise<string | undefined> {
  /* Before the slice, because slicing an empty file reads zero bytes and would
     be reported as an unrecognised format rather than as what it is. */
  if (file.size === 0) return 'That file is empty.';

  if (file.size > MAX_FILE_BYTES) {
    return `That file is ${readableSize(file.size)}. ${readableSize(MAX_FILE_BYTES)} is the most a photograph can be — anything larger is usually a video or a scan.`;
  }

  const actual = known !== undefined ? known : await sniffImageType(file);

  /* An unrecognised signature is NOT refused here. This check is a courtesy —
     it exists to give a fast, accurate message for the handful of things that
     are obviously not photographs. Deciding what is a valid image is the
     decoder's job, and it is better at it than any table: it knows what this
     particular engine on this particular device can actually draw, which is
     the only question that matters. Anything it cannot draw is refused in
     prepareChoice with a reason.
     
     This is what lets every format through. A list here would have to be
     updated for each new one, and would be wrong on some device either way. */
  if (actual && NOT_AN_IMAGE[actual]) {
    return `That is ${NOT_AN_IMAGE[actual]}, not a photograph.`;
  }

  return undefined;
}

/**
 * Tell the server an upload failed, so that it is reportable at all.
 *
 * Fire and forget, and deliberately unawaited: a report is never allowed to
 * slow an upload down, and a report that fails must never become a second
 * failure on top of the one it was describing. `keepalive` so it still leaves
 * the machine when the member gives up and navigates away, which is exactly
 * when the interesting failures happen.
 */
export function reportUploadFailure(
  stage: 'choose' | 'decode' | 'compress' | 'put' | 'insert',
  reason: string,
  file?: File,
  sniffed?: string | null,
): void {
  try {
    void fetch('/api/upload-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        stage,
        reason,
        sniffed: sniffed ?? 'unknown',
        bytes: file?.size ?? -1,
      }),
    }).catch(() => {});
  } catch {
    /* Reporting is best effort by definition. */
  }
}

export interface ChosenImage {
  /** What to upload. A HEIC original is replaced by its JPEG conversion. */
  file: File;
  /** An object URL for showing it. The caller owns it and must revoke it. */
  url: string;
}

/**
 * Take what somebody picked and hand back something this browser can both draw
 * and compress.
 *
 * For everything except HEIC that is the file itself and costs nothing. For
 * HEIC it is a JPEG, converted here, once — which matters because the frame is
 * needed twice: the preview draws it, and the compressor re-encodes it. Doing
 * the conversion at the moment of choosing means the rest of the pipeline
 * never learns that HEIC exists, and the preview is the same bytes that will
 * be uploaded rather than a second decode of the same file.
 *
 * Quality is high because this is an intermediate: compressToBudget re-encodes
 * it to under 200KB afterwards, and starting that from an already-lossy frame
 * would show.
 */
export async function prepareChoice(file: File, known?: string | null): Promise<ChosenImage> {
  /* ---------------------------------------------------------------------
   * ASK THE ENGINE FIRST, ALWAYS.
   *
   * This used to convert on the strength of the signature alone, and that was
   * wrong in the one place it mattered most. Safari on iOS and macOS decodes
   * HEIC natively — it is Apple's own format — so an iPhone photograph needs
   * no conversion at all. Routing it through WebAssembly anyway meant every
   * iPhone upload depended on a 3MB module loading and running, and failed
   * with "could not be read" whenever it did not.
   *
   * So the question asked is not "what format is this" but "can this browser
   * draw it", which is the question that actually decides. Chrome on Android
   * says no to HEIC and gets the decoder; Safari says yes and never loads it.
   * ------------------------------------------------------------------- */
  /* Only HEIC is ever in question, so only HEIC pays for the answer.
   *
   * Probing every file cost a full extra decode of every photograph — three
   * per upload (probe, preview, compress) where two had always been enough.
   * On a phone holding a 12MP frame that is real memory and real seconds,
   * spent on a question already answered for every format but one. */
  const sniffed = known !== undefined ? known : await sniffImageType(file);
  if (sniffed !== 'image/heic') {
    return { file, url: URL.createObjectURL(file) };
  }

  /* HEIC, and now it matters which engine this is. Safari decodes it natively
   * and needs no conversion; Chrome cannot and needs the decoder. */
  if (await canRenderNatively(file)) return { file, url: URL.createObjectURL(file) };

  /* Chrome, on any platform, cannot read it. Off to the server. */
  const converted = await convertHeicOnServer(file);
  return { file: converted, url: URL.createObjectURL(converted) };
}

/**
 * Hand a HEIC frame to the server and get a JPEG back.
 *
 * This used to happen in the browser, and the browser was the wrong place for
 * it. libheif ships compiled USE_WASM=0 — plain JavaScript, 2.9MB of it — and a
 * mid-range Android running an asm.js HEVC decoder over a 12MP photograph is
 * not a tuning problem, it is a device that cannot do the work. The failures
 * came from exactly those phones.
 *
 * The server has memory and CPU, runs the same code for everybody, and the
 * bundle stops carrying a decoder for a format most uploads are not.
 *
 * Only the conversion moves. The downscale, the quality ladder and the 200KB
 * budget all stay in the browser, because that is what keeps what gets uploaded
 * small — this sends one HEIC and receives one JPEG, and the pipeline that
 * always ran carries on from there.
 */
async function convertHeicOnServer(file: File): Promise<File> {
  let response: Response;
  try {
    response = await fetch('/api/heic-convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: file,
    });
  } catch {
    /* A dropped connection, not a bad photograph — worth saying differently,
       because "try again" is useless advice for a file that will never work
       and the only useful advice for one that would have. */
    reportUploadFailure('choose', 'heic convert: network', file, 'image/heic');
    throw new HeicConversionError('offline');
  }

  if (!response.ok) {
    let reason = String(response.status);
    if (response.status === 401) reason = 'unauthorised';
    else if (response.status === 413) reason = 'too_large';
    else {
      try {
        reason = ((await response.json()) as { error?: string })?.error ?? reason;
      } catch {
        /* Keep the status code. */
      }
    }
    reportUploadFailure('choose', `heic convert: ${reason}`, file, 'image/heic');
    throw new HeicConversionError(reason);
  }

  const blob = await response.blob();
  return new File([blob], `${file.name.replace(/\.[^.]*$/, '')}.jpg`, { type: 'image/jpeg' });
}

/**
 * Whether this engine will draw this file, answered by trying.
 *
 * An <img> rather than createImageBitmap: it is what the preview uses, so a
 * yes here is a promise the preview can keep. The object URL is revoked either
 * way — this is a question, not a decode anybody keeps.
 */
export function canRenderNatively(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const probe = new window.Image();
    const done = (answer: boolean) => {
      URL.revokeObjectURL(url);
      resolve(answer);
    };
    probe.onload = () => done(probe.naturalWidth > 0 && probe.naturalHeight > 0);
    probe.onerror = () => done(false);
    probe.src = url;
  });
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

type Decoded = { source: CanvasImageSource; width: number; height: number; release: () => void };

/**
 * Decode to something drawable. createImageBitmap is preferred because it can
 * apply EXIF rotation — without which a photograph taken in portrait on a
 * phone is drawn sideways, since the rotation lives in metadata the canvas
 * would otherwise discard. Where it is missing, an <img> still gets us a
 * source to compress, which matters more than the rotation.
 */
function fromBitmap(bitmap: ImageBitmap): Decoded {
  return {
    source: bitmap,
    width: bitmap.width,
    height: bitmap.height,
    release: () => bitmap.close(),
  };
}

/**
 * The safety net: a HEIC that reached uploadImage without going through
 * prepareChoice. Converted server-side like any other, then decoded as the
 * ordinary JPEG it now is.
 */
async function decodeHeic(file: File): Promise<Decoded | null> {
  try {
    return await decodeViaImgElement(await convertHeicOnServer(file));
  } catch {
    return null;
  }
}

async function decode(file: File): Promise<Decoded | null> {
  if (typeof createImageBitmap === 'function') {
    try {
      return fromBitmap(await createImageBitmap(file, { imageOrientation: 'from-image' }));
    } catch {
      /* Fall through to the <img> path. */
    }
  }

  const drawable = await decodeViaImgElement(file);
  if (drawable) return drawable;

  /* Last, and only for the one format no browser engine here can read. Checked
     by signature rather than by name, because the name is what lied. */
  if ((await sniffImageType(file)) === 'image/heic') return decodeHeic(file);

  return null;
}

function decodeViaImgElement(file: File): Promise<Decoded | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () =>
      resolve({
        source: image,
        width: image.naturalWidth,
        height: image.naturalHeight,
        release: () => URL.revokeObjectURL(url),
      });
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    image.src = url;
  });
}

/** Draw the source at a given longest edge and hand back the canvas. */
function drawAt(decoded: Decoded, edge: number): { canvas: HTMLCanvasElement; width: number; height: number } | null {
  const longest = Math.max(decoded.width, decoded.height);
  const scale = longest > edge ? edge / longest : 1;
  const width = Math.max(1, Math.round(decoded.width * scale));
  const height = Math.max(1, Math.round(decoded.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return null;

  /* Downscaling in one step is what makes a resized photograph look crunchy;
     the browser's own smoothing is doing the filtering here. */
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(decoded.source, 0, 0, width, height);
  return { canvas, width, height };
}

/**
 * Resize and re-encode until the result is under TARGET_BYTES, in the browser,
 * before anything is uploaded.
 *
 * This never refuses. Whatever comes in — a 60MP camera original, a screenshot,
 * a frame of pure grain — comes out under the ceiling, because the loop keeps
 * spending resolution until it does. Every image fits under 200KB at some
 * size; the job here is to find the largest size that does, not to argue with
 * the person who chose the photograph.
 *
 * Quality is spent before resolution: a slightly softer 2000px frame looks
 * better on a retina screen than a crisp 1000px one.
 */
/**
 * The largest encoding of `file` that fits TARGET_BYTES, or null if the ladder
 * and the shrink loop both ran out.
 *
 * Split out of prepareImage so the variant ladder can reuse a single decode.
 * Decoding is the expensive half — a 60MP frame costs a few hundred
 * milliseconds and a lot of memory on a phone — and doing it once per width
 * would have made a four-width ladder four times the work for no new pixels.
 */
async function compressToBudget(
  decoded: Decoded,
  kind: UploadKind,
): Promise<PreparedImage | null> {
  const target = TARGET_BYTES[kind];
  const useWebp = canEncodeWebp();
  const type = useWebp ? 'image/webp' : 'image/jpeg';
  const extension = useWebp ? 'webp' : 'jpg';
  const made = (blob: Blob, width: number, height: number): PreparedImage => ({
    blob, width, height, extension, contentType: type,
  });

  let smallest: PreparedImage | null = null;

  for (const edge of EDGE_STEPS[kind]) {
    const drawn = drawAt(decoded, edge);
    if (!drawn) break;

    for (const quality of QUALITY_STEPS) {
      const blob = await toBlob(drawn.canvas, type, quality);
      if (!blob) continue;
      if (blob.size <= target) return made(blob, drawn.width, drawn.height);
      if (!smallest || blob.size < smallest.blob.size) {
        smallest = made(blob, drawn.width, drawn.height);
      }
    }
  }

  /* Still over. Keep shrinking — this is what makes the ceiling hold for
     images the ladder above cannot squeeze, and it always terminates: each
     pass is a quarter smaller, so even a 60MP frame is down to thumbnail
     size within a dozen or so. */
  let edge = EDGE_STEPS[kind][EDGE_STEPS[kind].length - 1];
  for (let attempt = 0; attempt < 24 && edge > 16; attempt += 1) {
    edge = Math.max(16, Math.round(edge * SHRINK_FACTOR));
    const drawn = drawAt(decoded, edge);
    if (!drawn) break;

    const blob = await toBlob(drawn.canvas, type, SHRINK_QUALITY);
    if (!blob) continue;
    if (blob.size <= target) return made(blob, drawn.width, drawn.height);
    if (!smallest || blob.size < smallest.blob.size) {
      smallest = made(blob, drawn.width, drawn.height);
    }
  }

  return smallest;
}

const EXTENSION_FOR: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

/**
 * The original, untouched, when nothing better can be produced.
 *
 * Reached only when the image decoded and no encoding of it came back, which
 * is rare — but it is the one path that stores bytes nobody re-encoded, so it
 * checks them rather than trusting them. Both the type and the extension come
 * from the signature: `file.type` is the operating system's guess from the
 * name, and storing a HEIC as `image/jpeg` because it was named `.jpg` is the
 * exact failure this whole path exists to stop.
 */
async function passThrough(file: File): Promise<PreparedImage> {
  const actual = await sniffImageType(file);
  if (!actual || !STORABLE_TYPES.includes(actual)) throw new UndecodableImageError();

  const size = (await readDimensions(file)) ?? { width: 0, height: 0 };
  return {
    blob: file,
    width: size.width,
    height: size.height,
    extension: EXTENSION_FOR[actual],
    contentType: actual,
  };
}

/**
 * Resize and re-encode until the result is under TARGET_BYTES, in the browser,
 * before anything is uploaded.
 *
 * This never refuses. Whatever comes in — a 60MP camera original, a screenshot,
 * a frame of pure grain — comes out under the ceiling, because the loop keeps
 * spending resolution until it does. Every image fits under 200KB at some
 * size; the job here is to find the largest size that does, not to argue with
 * the person who chose the photograph.
 *
 * Quality is spent before resolution: a slightly softer 2000px frame looks
 * better on a retina screen than a crisp 1000px one.
 */
export async function prepareImage(file: File, kind: UploadKind): Promise<PreparedImage> {
  const decoded = await decode(file);
  /* Undecodable. Passing the original through used to happen here, and it was
     the wrong instinct: bytes this browser cannot draw are bytes it cannot
     shrink either, so what got stored was the full-size original under a name
     promising a compressed one — rejected by the bucket ceiling if it was
     large, and served as a permanently broken image to every visitor if it was
     not. Refusing is the only outcome that tells anybody. */
  if (!decoded) throw new UndecodableImageError();
  try {
    return (await compressToBudget(decoded, kind)) ?? (await passThrough(file));
  } finally {
    decoded.release();
  }
}

export interface PreparedLadder {
  /** The largest. `storage_path` points at this one. */
  primary: PreparedImage;
  /** Strictly narrower than the primary, ascending. May be empty. */
  smaller: PreparedImage[];
}

/**
 * The primary encoding plus the ladder rungs below it, from one decode.
 *
 * These exist so an uploaded photograph can be served the way the archive in
 * /public is: a plain srcset over files that already exist, with no image
 * optimiser in the request path. A phone showing a 45vw thumbnail fetches the
 * 640 rung instead of a 2000px frame, which is a bandwidth win on its own —
 * the optimiser was doing that resize per request and billing for it.
 *
 * Rungs are encoded at a fixed quality rather than searched against a byte
 * budget. The budget exists to stop a 2000px frame being enormous; a 640px one
 * cannot be, so a second search would only spend the member's battery.
 */
export async function prepareLadder(file: File, kind: UploadKind): Promise<PreparedLadder> {
  const decoded = await decode(file);
  /* See prepareImage: an undecodable file is refused, not passed through. */
  if (!decoded) throw new UndecodableImageError();

  try {
    const primary = (await compressToBudget(decoded, kind)) ?? (await passThrough(file));
    const smaller: PreparedImage[] = [];

    for (const width of VARIANT_LADDERS[CURRENT_LADDER][kind]) {
      if (width >= primary.width) continue;
      /* drawAt takes a longest edge, and the ladder is expressed in widths.
         For a portrait frame those differ, so scale the edge by the aspect
         ratio to land on the intended width. */
      const edge = Math.round(width * Math.max(1, primary.height / primary.width));
      const drawn = drawAt(decoded, edge);
      if (!drawn) continue;

      /* ------------------------------------------------------------------
       * The rung has to fit the bucket, not just look right.
       *
       * Both buckets carry a hard 200 KiB file_size_limit (migration 0005),
       * and Storage rejects anything over it. A rung encoded at a flat quality
       * sails past that more often than it sounds: the primary reached the
       * ceiling by spending quality — a dense 2000px frame can end up at 0.55
       * — and the same picture at 1600px and 0.8 is then comfortably larger
       * than the primary it is supposed to be a cheaper alternative to.
       *
       * The failure was quiet rather than loud, which is worse. uploadImage
       * degrades a rejected rung to a plain unladdered name, so the photograph
       * uploads and displays and nobody sees a problem — the ladder simply
       * never materialises, and the image stays on the optimiser forever.
       *
       * So rungs walk the same quality ladder the budget search uses, and a
       * rung that cannot fit at any of them is dropped. Dropping one is safe:
       * widths are resolved from the ladder version, so a missing rung would
       * be a 404 in a srcset — which is why the check below removes the whole
       * set rather than uploading a partial one.
       * ------------------------------------------------------------------ */
      let encoded: Blob | null = null;
      for (const quality of [RUNG_QUALITY, ...QUALITY_STEPS]) {
        const blob = await toBlob(drawn.canvas, primary.contentType, quality);
        if (!blob) continue;
        if (blob.size <= TARGET_BYTES[kind]) {
          encoded = blob;
          break;
        }
      }
      if (!encoded) continue;

      smaller.push({
        blob: encoded,
        width: drawn.width,
        height: drawn.height,
        extension: primary.extension,
        contentType: primary.contentType,
      });
    }

    return { primary, smaller };
  } finally {
    decoded.release();
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
  const problem = await checkFile(file, kind);
  if (problem) return { ok: false, error: problem };

  const supabase = getSupabaseBrowserClient();
  if (!supabase) return { ok: false, error: 'Uploads are not connected on this build.' };

  let ladder: PreparedLadder;
  try {
    ladder = await prepareLadder(file, kind);
  } catch (cause) {
    /* checkFile already turned away everything whose signature is unreadable,
       so reaching here means the signature was fine and the decoder still
       refused — a truncated file, or a format this browser alone lacks. */
    if (cause instanceof UploadRefusal) {
      reportUploadFailure('decode', cause.name, file, await sniffImageType(file));
      return { ok: false, error: cause.message };
    }
    throw cause;
  }
  const { primary, smaller } = ladder;
  const base = `${ownerId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const put = (at: string, image: PreparedImage) =>
    supabase.storage.from(BUCKET[kind]).upload(at, image.blob, {
      cacheControl: '31536000',
      upsert: false,
      contentType: image.contentType,
    });

  /* ---------------------------------------------------------------------
   * The narrow rungs go up first, and the primary last.
   *
   * Order matters because storage_path points at the primary, and the name it
   * is given is a promise that the siblings exist — Picture builds a srcset
   * from that name without checking. Uploading it last means the promise is
   * only made once it is already true.
   *
   * If a rung fails, the primary is stored under a plain name instead. That is
   * a complete, correct upload with no variants, served through the optimiser
   * like every upload from before this existed. Degrading is the right failure
   * here: the alternative is refusing a photograph somebody chose because a
   * thumbnail did not upload.
   * ------------------------------------------------------------------- */
  /* Every rung the ladder promises, or none of them. `variantWidths` derives
     the srcset from the ladder version and the stored width, so it will name a
     rung whether or not it was uploaded — a set missing one is a 404 inside a
     srcset, which browsers resolve by falling back to a different width and
     which nothing in the app would surface. */
  const expected = VARIANT_LADDERS[CURRENT_LADDER][kind].filter((w) => w < primary.width);
  const uploaded: string[] = [];
  /* An empty ladder is intact. A photograph narrower than the smallest rung
     asks for no siblings, and naming it `-v1-<width>` is still true: every
     consumer derives the widths from the stored width, so it resolves to
     itself. Requiring a rung here is what left one 619px upload under a plain
     name, and a plain name was the one path still going through the billed
     optimiser — invisible until the quota ran out and it answered 402. */
  let ladderIntact = smaller.length === expected.length;

  for (const rung of smaller) {
    const at = variantPath(base, CURRENT_LADDER, rung.width, rung.extension);
    const { error: rungError } = await put(at, rung);
    if (rungError) {
      ladderIntact = false;
      break;
    }
    uploaded.push(at);
  }

  if (!ladderIntact && uploaded.length > 0) {
    await supabase.storage.from(BUCKET[kind]).remove(uploaded);
  }

  const path = ladderIntact
    ? variantPath(base, CURRENT_LADDER, primary.width, primary.extension)
    : `${base}.${primary.extension}`;

  const { error } = await put(path, primary);
  if (error && uploaded.length > 0) {
    await supabase.storage.from(BUCKET[kind]).remove(uploaded);
  }

  if (error) {
    reportUploadFailure('put', error.message.slice(0, 120), file, primary.contentType);
    const message = error.message.toLowerCase();
    if (message.includes('exceeded') || message.includes('too large')) {
      /* Names the ceiling that actually rejected it. This used to quote
         LIMITS — 10MB for a photograph — which is not enforced anywhere and is
         fifty times the real bucket limit, so the one person who ever saw it
         was sent to look at the wrong thing entirely. */
      return {
        ok: false,
        error: `That photograph could not be compressed under ${readableSize(TARGET_BYTES[kind])}, which is the most one image may be. Very grainy or very detailed frames occasionally do this.`,
      };
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
    width: primary.width,
    height: primary.height,
    bytes: primary.blob.size,
  };
}

/**
 * Every file `path` names, including its narrower rungs. A path with no
 * variant marker names only itself.
 *
 * The set is derived from the name rather than listed from the bucket, which
 * is the whole point of encoding the ladder there — see lib/images.ts.
 */
export function variantSiblings(kind: UploadKind, path: string): string[] {
  const parsed = parseVariantPath(path);
  if (!parsed) return [path];
  return variantWidths(kind, parsed.ladder, parsed.width).map((w) =>
    variantPath(parsed.base, parsed.ladder, w, parsed.extension),
  );
}

/**
 * Remove a file and every rung that belongs to it. The policy limits this to
 * the member's own folder.
 *
 * Deleting only `path` would leave the thumbnails behind: invisible, because
 * nothing points at them once the row is gone, and permanent, because the
 * orphan sweep is the only thing that would ever look again.
 */
export async function removeImage(kind: UploadKind, path: string): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return false;
  const { error } = await supabase.storage.from(BUCKET[kind]).remove(variantSiblings(kind, path));
  return !error;
}

/**
 * Remove a file and be sure about it.
 *
 * Deleting a photograph has to take the bytes with it — a file left in the
 * bucket after its row is gone is invisible, permanent and still billed, and
 * nobody asked for a backup. So this retries rather than hoping, and reports
 * honestly when it could not.
 *
 * `storage.remove` answers without error for a path that is already absent,
 * so a second attempt after a network blip is safe.
 */
export async function removeImageSurely(
  kind: UploadKind,
  path: string,
  attempts = 3,
): Promise<boolean> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (await removeImage(kind, path)) return true;
    if (attempt < attempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
    }
  }
  return false;
}

/**
 * Delete everything in a member's avatar folder except the file they are now
 * using.
 *
 * Replacing a picture already deletes the file it replaced, one for one. That
 * is correct and it is also fragile: it depends on the browser staying open
 * long enough to issue the delete, on the previous URL being in state, and on
 * that delete succeeding. Miss any of those — a closed tab, a dropped
 * connection, a sign-in that changed the URL underneath — and a file is left
 * behind that nothing points at and nothing will ever look for again. An
 * orphan sweep found two of them, 27 kB, from a single member.
 *
 * Sweeping the folder instead is self-healing. Every time somebody changes
 * their picture, whatever accumulated before is cleared too, so a missed
 * delete costs storage until their next change rather than forever. Storage
 * policy already scopes both the listing and the removal to `auth.uid()`, so
 * this can only ever touch the caller's own folder.
 */
export async function sweepAvatarFolder(ownerId: string, keepPath: string | null): Promise<number> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return 0;

  const { data, error } = await supabase.storage.from(BUCKET.avatar).list(ownerId, { limit: 100 });
  if (error || !data) return 0;

  /* Not one filename — the whole set the current avatar consists of. Keeping
     only the primary here would have deleted its own thumbnails moments after
     they were uploaded, and the avatar would have fallen back to the optimiser
     with a srcset of 404s behind it. */
  const keep = new Set(
    (keepPath ? variantSiblings('avatar', keepPath) : []).map((p) => p.split('/').pop()),
  );
  const stale = data
    .filter((file) => !keep.has(file.name))
    .map((file) => `${ownerId}/${file.name}`);

  if (stale.length === 0) return 0;

  const { error: removeError } = await supabase.storage.from(BUCKET.avatar).remove(stale);
  return removeError ? 0 : stale.length;
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
