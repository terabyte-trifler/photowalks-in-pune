import * as Sentry from '@sentry/nextjs';
import { NextResponse } from 'next/server';

/* ============================================================================
 * WHY THIS ROUTE EXISTS
 * ----------------------------------------------------------------------------
 * An upload fails entirely in the browser — decode, compress, PUT to Storage —
 * and the browser reports nothing, by design: migration of the client SDK out
 * of the bundle (1db843c) was measured and correct, at 86kB and 1.7s of LCP for
 * three outages it could not have caught.
 *
 * But it left this path dark. When members said photographs would not upload,
 * there was no record of a single failure: not what failed, not on what device,
 * not how often. The only forensic trail was orphaned files in Storage, and a
 * failure that dies before the first PUT does not even leave those. Every
 * diagnosis was therefore a guess against a symptom described over chat.
 *
 * So the browser posts a handful of facts here and the SERVER reports them,
 * through the Sentry that is already initialised for server errors. The cost in
 * the bundle is one fetch call. No SDK comes back.
 *
 * WHAT IS DELIBERATELY NOT COLLECTED
 * No filename — people name photographs after people and places. No image
 * bytes. No pixels. The user agent is read from the request headers rather than
 * sent in the body, and identity is left to whatever Sentry already knows from
 * the session; nothing here adds it.
 * ========================================================================== */

export const runtime = 'nodejs';

/** Bounded so a malformed or hostile body cannot become the payload. */
const STAGES = ['choose', 'decode', 'compress', 'put', 'insert'];

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const b = (body ?? {}) as Record<string, unknown>;
  const stage = typeof b.stage === 'string' && STAGES.includes(b.stage) ? b.stage : 'unknown';
  const reason = typeof b.reason === 'string' ? b.reason.slice(0, 200) : 'unstated';
  const sniffed = typeof b.sniffed === 'string' ? b.sniffed.slice(0, 40) : 'unknown';
  const bytes = Number.isFinite(b.bytes) ? Number(b.bytes) : -1;

  /* ------------------------------------------------------------------
   * The platform log first, and Sentry second, because Sentry is allowed to
   * be absent and this is not.
   *
   * NEXT_PUBLIC_SENTRY_DSN is unset in production, so sentryOptions resolves
   * `enabled: false` and every capture below is a no-op. Two real upload
   * failures were reported through this route and both were discarded — the
   * route answered 204 and lost them, which is a worse failure than having no
   * reporting at all, because it looks like reporting.
   *
   * console.error lands in the runtime log whatever else is configured. It
   * costs nothing and it cannot be switched off by a missing variable.
   * ------------------------------------------------------------------ */
  console.error(
    `[upload-error] stage=${stage} reason=${reason} sniffed=${sniffed} bytes=${bytes} ua=${
      request.headers.get('user-agent')?.slice(0, 160) ?? 'absent'
    }`,
  );

  Sentry.captureMessage(`upload failed at ${stage}: ${reason}`, {
    level: 'warning',
    tags: { area: 'uploads', stage, sniffed },
    extra: {
      bytes,
      /* From the header, not the body: the client does not get to claim this. */
      userAgent: request.headers.get('user-agent')?.slice(0, 300) ?? 'absent',
    },
  });

  /* 204 rather than a body: nothing the browser does depends on the answer,
     and a failed report must never become a second thing that failed. */
  return new NextResponse(null, { status: 204 });
}
