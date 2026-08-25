/** Small helpers only. No dependency is worth adding for any of this. */

/** Conditional className joiner. */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

/* ----------------------------------------------------------------------------
 * WALK DATES ARE PUNE DATES, WHEREVER THEY ARE RENDERED
 * ----------------------------------------------------------------------------
 * These used to parse at IST and then read the result back with getDate() and
 * getDay(), which are local-timezone getters. That is correct on a laptop set
 * to IST and wrong everywhere else: Vercel renders in UTC, five and a half
 * hours behind, so midnight in Pune fell on the previous day and every walk on
 * the live site showed a date one day early.
 *
 * It was invisible in development for exactly the reason it was dangerous —
 * the machine writing the code was in the same timezone as the walks.
 *
 * A walk on Sunday morning in Kasba Peth is on that Sunday no matter where the
 * server is, so the timezone is pinned rather than inherited. Intl does the
 * conversion; there is no arithmetic here to get wrong.
 * -------------------------------------------------------------------------- */

const PUNE = 'Asia/Kolkata';

/** Parsed at IST so the instant is right; formatted at IST so the reading is. */
const parse = (iso: string): Date => new Date(`${iso}T00:00:00+05:30`);

const inPune = (iso: string, options: Intl.DateTimeFormatOptions): string =>
  new Intl.DateTimeFormat('en-GB', { timeZone: PUNE, ...options }).format(parse(iso));

export const weekday = (iso: string): string => inPune(iso, { weekday: 'long' });
export const dayNumber = (iso: string): string => inPune(iso, { day: '2-digit' });
export const monthShort = (iso: string): string => inPune(iso, { month: 'short' });

/** "23 Aug 2026" — a photograph's date, with no weekday. */
export const shortDate = (iso: string): string => {
  const d = parse(iso);
  if (Number.isNaN(d.getTime())) return '';
  return inPune(iso, { day: 'numeric', month: 'short', year: 'numeric' });
};

export const longDate = (iso: string): string =>
  inPune(iso, { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })
    /* en-GB gives "Sunday 23 Aug 2026" with a comma after the weekday. */
    .replace(',', '');

/* ----------------------------------------------------------------------------
 * WHEN A WALK STOPS TAKING PEOPLE
 * ----------------------------------------------------------------------------
 * Registration closes at 18:00 on the walk's own date, Pune time. After that
 * the walk is over, or close enough that somebody turning up would be turning
 * up to an empty street.
 *
 * The offset is written out rather than inferred, for the same reason the
 * dates above are: this has to give the same answer on a laptop in Pune and on
 * a Vercel box in UTC. India has no daylight saving, so a fixed +05:30 is
 * correct all year — which is not something to assume about a timezone in
 * general, but is true of this one.
 *
 * The database enforces the same rule (migration 0014). This is what stops the
 * button being offered; that is what stops the row being written.
 * -------------------------------------------------------------------------- */

/** Registration closes at this hour, IST, on the day of the walk. */
export const REGISTRATION_CLOSES_HOUR_IST = 18;

/** The instant registration closes. Invalid dates give an invalid Date. */
export const registrationClosesAt = (iso: string): Date =>
  new Date(`${iso}T${String(REGISTRATION_CLOSES_HOUR_IST).padStart(2, '0')}:00:00+05:30`);

/**
 * Whether this walk has stopped taking people.
 *
 * `now` is a parameter so the behaviour either side of the cutoff can be
 * tested without waiting for six in the evening.
 */
export const registrationClosed = (iso: string, now: Date = new Date()): boolean => {
  const closes = registrationClosesAt(iso).getTime();
  /* A malformed date should not silently close a walk that is still open. */
  if (Number.isNaN(closes)) return false;
  return now.getTime() >= closes;
};

export const priceLabel = (price: number): string => (price === 0 ? 'Free' : `₹${price}`);

export const isNearlyFull = (spots: number, capacity: number): boolean =>
  spots > 0 && spots <= capacity * 0.25;

export const spotsLabel = (spots: number, capacity: number): string => {
  if (spots <= 0) return 'Walk full';
  if (isNearlyFull(spots, capacity)) return `${spots} spots left`;
  return `${spots} of ${capacity} spots`;
};

export const padIndex = (n: number): string => String(n).padStart(2, '0');

/** The month a member joined, in the same voice as the walk dates. */
export const joinedLabel = (iso: string): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });
};

/** Initials for the monogram shown when a member has no avatar. */
export const initials = (fullName: string): string => {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '\u00b7';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};
