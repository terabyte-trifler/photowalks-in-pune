/** Small helpers only. No dependency is worth adding for any of this. */

/** Conditional className joiner. */
export function cn(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(' ');
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Walk dates are Pune local time, so they are parsed at IST rather than UTC. */
const parse = (iso: string): Date => new Date(`${iso}T00:00:00+05:30`);

export const weekday = (iso: string): string => DAYS[parse(iso).getDay()];
export const dayNumber = (iso: string): string => String(parse(iso).getDate()).padStart(2, '0');
export const monthShort = (iso: string): string => MONTHS[parse(iso).getMonth()];

export const longDate = (iso: string): string => {
  const d = parse(iso);
  return `${weekday(iso)} ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
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
