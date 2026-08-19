/* ============================================================================
 * VALIDATION
 * ----------------------------------------------------------------------------
 * Shared by the forms and by the server action that writes a profile, so the
 * browser and the server agree on what is acceptable. Client-side validation
 * is a courtesy; the server runs the same checks again and the database
 * constraints in supabase/migrations run them a third time.
 *
 * The copy is the site's voice: short, plain sentences, no exclamation marks.
 * ========================================================================== */

import { MAX_INTERESTS, isPhotographyStyle, type PhotographyStyle } from '@/data/photography';

export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
export const USERNAME_PATTERN = /^[a-z0-9_]{3,30}$/;

/** Kept in step with the check constraints in the profiles migration. */
export const LIMITS = {
  fullName: 80,
  username: 30,
  bio: 280,
  city: 60,
  instagram: 30,
  website: 200,
  password: { min: 8, max: 72 },
  interests: MAX_INTERESTS,
} as const;



export function validateFullName(value: string): string | undefined {
  const name = value.trim();
  if (!name) return 'We need a name to put on the meeting point list.';
  if (name.length < 2) return 'That name is too short.';
  if (name.length > LIMITS.fullName) return `Keep this under ${LIMITS.fullName} characters.`;
  return undefined;
}

export function validateEmail(value: string): string | undefined {
  const email = value.trim();
  if (!email) return 'We need an email address.';
  if (!EMAIL_PATTERN.test(email)) return 'That email does not look right.';
  return undefined;
}

/**
 * Supabase enforces its own minimum (6 by default, raise it in
 * Authentication → Providers → Email). This is the stricter local rule, and it
 * asks for a mix rather than a symbol quota — length is what actually helps.
 */
export function validatePassword(value: string): string | undefined {
  if (!value) return 'Choose a password.';
  if (value.length < LIMITS.password.min) {
    return `At least ${LIMITS.password.min} characters, please.`;
  }
  if (value.length > LIMITS.password.max) {
    return `Passwords stop at ${LIMITS.password.max} characters.`;
  }
  if (!/[a-zA-Z]/.test(value) || !/[0-9]/.test(value)) {
    return 'Mix in at least one letter and one number.';
  }
  return undefined;
}

export function validateConfirmPassword(password: string, confirm: string): string | undefined {
  if (!confirm) return 'Type the password once more.';
  if (password !== confirm) return 'Those two passwords do not match.';
  return undefined;
}

export function validateUsername(value: string): string | undefined {
  const username = value.trim().toLowerCase();
  if (!username) return 'Pick a username.';
  if (username.length < 3) return 'At least three characters.';
  if (username.length > LIMITS.username) return `Keep this under ${LIMITS.username} characters.`;
  if (!USERNAME_PATTERN.test(username)) {
    return 'Lowercase letters, numbers and underscores only.';
  }
  return undefined;
}

export function validateCity(value: string): string | undefined {
  const city = value.trim();
  if (!city) return 'Which city do you shoot in?';
  if (city.length > LIMITS.city) return `Keep this under ${LIMITS.city} characters.`;
  return undefined;
}

export function validateBio(value: string): string | undefined {
  if (value.trim().length > LIMITS.bio) return `Keep this under ${LIMITS.bio} characters.`;
  return undefined;
}

export function validateInstagram(value: string): string | undefined {
  const handle = normaliseInstagram(value);
  if (!handle) return undefined;
  if (handle.length > LIMITS.instagram) return 'That handle is too long.';
  if (!/^[a-zA-Z0-9._]+$/.test(handle)) {
    return 'Letters, numbers, full stops and underscores only.';
  }
  return undefined;
}

/** Accepts @handle, a bare handle, or a full instagram.com URL. Stores the handle. */
export function normaliseInstagram(value: string): string {
  return value
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/^@/, '')
    .replace(/\/+$/, '')
    .split(/[/?#]/)[0];
}

/** Drops anything not in data/photography.ts, then caps the list. */
export function sanitiseInterests(values: unknown): PhotographyStyle[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const clean: PhotographyStyle[] = [];
  for (const value of values) {
    if (typeof value !== 'string' || !isPhotographyStyle(value) || seen.has(value)) continue;
    seen.add(value);
    clean.push(value);
    if (clean.length === LIMITS.interests) break;
  }
  return clean;
}

/**
 * A personal site. People type "example.com"; the scheme is added for them,
 * and anything that is not a plausible http(s) address is rejected rather than
 * stored and rendered as a broken link.
 */
export function normaliseWebsite(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function validateWebsite(value: string): string | undefined {
  const url = normaliseWebsite(value);
  if (!url) return undefined;
  if (url.length > LIMITS.website) return 'That address is too long.';
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return 'Only http and https addresses, please.';
    }
    if (!parsed.hostname.includes('.') || parsed.hostname.endsWith('.')) {
      return 'That does not look like a website address.';
    }
    return undefined;
  } catch {
    return 'That does not look like a website address.';
  }
}

/** example.com — what we actually show, rather than the full URL. */
export function websiteLabel(url: string): string {
  try {
    const { hostname, pathname } = new URL(url);
    const host = hostname.replace(/^www\./, '');
    return pathname && pathname !== '/' ? `${host}${pathname}` : host;
  } catch {
    return url;
  }
}

/**
 * The client-side preview of the username the database will mint from a full
 * name. The authority is `public.generate_username()` in the migration — this
 * only exists so the signup form can show people what to expect.
 */
export function suggestUsername(fullName: string): string {
  const slug = (raw: string): string =>
    raw
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '');

  const first = slug(fullName.trim().split(/\s+/)[0] ?? '');
  const whole = slug(fullName);
  const candidate = first.length >= 3 ? first : whole;
  return candidate.slice(0, LIMITS.username) || 'photographer';
}
