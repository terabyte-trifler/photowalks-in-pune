/* ============================================================================
 * REDIRECT SAFETY
 * ----------------------------------------------------------------------------
 * `?next=` is attacker-controlled. Unchecked, it turns every login link into
 * an open redirect: /login?next=https://evil.example sends somebody who has
 * just typed their password straight off the site, with our own domain in the
 * link they trusted.
 *
 * Only a path on this site is ever accepted. Protocol-relative URLs
 * (//evil.example) and their backslash variants are rejected along with the
 * obvious ones, and control characters are stripped before the check so a
 * newline cannot smuggle anything past it.
 * ========================================================================== */

const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;

export function safeNext(value: string | null | undefined, fallback = '/'): string {
  if (!value) return fallback;

  const candidate = value.replace(CONTROL_CHARS, '').trim();

  if (!candidate.startsWith('/')) return fallback;
  if (candidate.startsWith('//') || candidate.startsWith('/\\')) return fallback;
  /* /https:/evil.example and similar. */
  if (/^\/+[a-z][a-z0-9+.-]*:/i.test(candidate)) return fallback;

  return candidate;
}
