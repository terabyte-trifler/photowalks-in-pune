import convert from 'heic-convert';
import { NextResponse } from 'next/server';
import sharp from 'sharp';

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
    /* Two steps, because neither library does both. heic-convert reads HEIC
       and cannot resize; sharp resizes anything and cannot read HEIC — its
       libvips ships without HEIF, the format being patent-encumbered. So one
       decodes and the other shrinks. */
    const full = await convert({
      buffer: Buffer.from(input),
      format: 'JPEG',
      /* Generous, because this buffer never leaves the function: it exists for
         as long as it takes sharp to read it. Quality spent here is quality
         available to the resize; quality saved here would be saved nowhere. */
      quality: 0.92,
    });

    const jpeg = await sharp(full)
      /* Applies EXIF orientation and then drops it. Without this a portrait
         frame can arrive sideways: the rotation lives in metadata, and a
         canvas that reads the pixels alone never sees it. */
      .rotate()
      /* 2000 is EDGE_STEPS.photo[0] — the largest edge the browser is going to
         keep. Sending more than that is sending pixels that get thrown away in
         the next second, over the member's mobile data. */
      .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true })
      /* 78, measured on the largest real phone frame to hand (IMG_0906.HEIC,
         3.68MB, 12MP), after the resize to 1500x2000:
        
             q=82  798KB      q=78  712KB      q=75  658KB      q=70  592KB
        
         Past this the curve flattens and the quality is spent for very little.
         It hardly matters to what gets stored either way — compressToBudget
         squeezes this to under 200KB in the browser a second later, and two
         starting points 86KB apart are indistinguishable after that. It
         matters to the member's mobile data, which is the whole reason the
         resize is here. */
      .jpeg({ quality: 78, mozjpeg: true })
      .toBuffer();

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
