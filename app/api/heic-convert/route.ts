import convert from 'heic-convert';
import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth/session';

/* ============================================================================
 * HEIC -> JPEG, ON THE SERVER
 * ----------------------------------------------------------------------------
 * Android's browsers have no HEIC decoder and are not getting one — the format
 * is patent-encumbered — so a photograph straight off a phone has to be decoded
 * somewhere before it can be drawn, compressed, or stored.
 *
 * It used to be decoded in the browser, and that is what this replaces. The
 * library involved is libheif compiled USE_WASM=0: not WebAssembly, plain
 * JavaScript, 2.9MB of it. Measured on the devices that actually failed, a
 * mid-range Android running an asm.js HEVC decoder over a 12MP frame is the
 * whole problem — there is no tuning that makes it reliable, because the
 * constraint is the device.
 *
 * Here there is memory and there is CPU, the same code runs for every visitor
 * regardless of what they are holding, and the browser bundle loses 2.9MB it
 * was downloading the first time anybody chose an iPhone photograph.
 *
 * WHAT THIS IS NOT
 * Not a general image service. It converts one format, for signed-in members,
 * under a size cap. Everything else the pipeline already did in the browser —
 * downscaling, the quality ladder, the 200KB budget — still happens there,
 * because that is what keeps the upload small and the bucket cheap.
 * ========================================================================== */

/* libheif is a Node library. Edge has no filesystem and no Buffer. */
export const runtime = 'nodejs';

/* Decoding a 12MP frame in JavaScript is seconds, not milliseconds. The
   default of 10 would cut off the large frames this exists to handle. */
export const maxDuration = 60;

/**
 * Serverless request bodies are capped around 4.5MB on the platform, and a
 * base64 or multipart envelope inflates what we send. 4MB of actual image
 * leaves room and is well above what a phone produces: the HEIC files measured
 * for this ran 0.27MB to 1.49MB.
 */
const MAX_BYTES = 4 * 1024 * 1024;

/** `ftyp` at offset 4, then a brand. The name is not evidence; this is. */
function isHeic(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  const at = (from: number, to: number) => String.fromCharCode(...bytes.subarray(from, to));
  if (at(4, 8) !== 'ftyp') return false;
  const brands = at(8, Math.min(32, bytes.length));
  /* avif first: some encoders write mif1 as the major brand and name avif only
     in the compatible list, and an AVIF sent here would be a caller bug worth
     failing loudly rather than a frame to decode. */
  if (/avif|avis/.test(brands)) return false;
  return /heic|heix|heim|heis|hevc|hevx|mif1|msf1/.test(brands);
}

export async function POST(request: Request): Promise<NextResponse> {
  /* Signed-in members only. Without this the route is an open image-conversion
     service on somebody else's compute budget, and the first person to notice
     would not be a photographer. */
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Not signed in.' }, { status: 401 });
  }

  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > MAX_BYTES) {
    return NextResponse.json({ error: 'too_large' }, { status: 413 });
  }

  const input = new Uint8Array(await request.arrayBuffer());
  /* Checked again against the real body: content-length is the client's claim. */
  if (input.byteLength === 0 || input.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: 'too_large' }, { status: 413 });
  }

  if (!isHeic(input)) {
    return NextResponse.json({ error: 'not_heic' }, { status: 415 });
  }

  try {
    const jpeg = await convert({
      buffer: Buffer.from(input),
      format: 'JPEG',
      /* ------------------------------------------------------------------
       * 0.7, and the number is load-bearing: the ANSWER has a size limit too,
       * not only the request. Measured on the largest real phone frame to hand
       * (IMG_0906.HEIC, 3.68MB, 12MP):
       *
       *   q=0.92  ->  5.53MB   over the platform's response cap
       *   q=0.80  ->  3.46MB   uncomfortably close to it
       *   q=0.70  ->  2.76MB   room to spare
       *   q=0.60  ->  2.34MB
       *
       * Quality costs almost nothing here, because this frame is an
       * intermediate that never gets stored: compressToBudget re-encodes it to
       * under 200KB in the browser within the second, and at that target the
       * difference between starting from 0.92 and from 0.7 is not visible.
       * What the higher number would buy is a response large enough to fail.
       * ------------------------------------------------------------------ */
      quality: 0.7,
    });

    return new NextResponse(new Uint8Array(jpeg), {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        /* One member's photograph, on its way to being uploaded. Nothing about
           it should be held anywhere between here and there. */
        'Cache-Control': 'no-store',
      },
    });
  } catch (cause) {
    console.error('[heic-convert] failed', cause);
    return NextResponse.json({ error: 'decode_failed' }, { status: 422 });
  }
}
