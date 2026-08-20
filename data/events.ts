/* ============================================================================
 * WALKS
 * ----------------------------------------------------------------------------
 * Set the ISO `date` and every display string is derived (see lib/utils.ts).
 * `capacity` is the ceiling; how many spots are left is counted from real
 * RSVPs at render time by lib/walks.ts, never stored here.
 *
 * IMPORTANT — `verified`
 * Event structured data is only emitted for walks marked `verified: true`.
 * Everything below is sample data, so it is false and no Event schema is
 * published. Flip it once the date, time, meeting point and cost are real.
 * ========================================================================== */

export type WalkStatus = 'open' | 'filling' | 'full' | 'past';

export interface Event {
  id: string;
  /** Reserved for the future /walks/[slug] route. */
  slug: string;
  title: string;
  date: string;
  time: string;
  location: string;
  area: string;
  description: string;
  theme: string;
  image: string;
  imageAlt: string;
  /** INR. 0 means free. */
  price: number;
  capacity: number;
  status: WalkStatus;
  /** True only when the details are confirmed and publishable as schema.org. */
  verified: boolean;
  /**
   * The username of the member hosting this walk, if one has volunteered.
   * Deliberately unset on every walk below: a host is a real person and
   * naming one who has not agreed would be inventing them. Set it to a real
   * profile's username and it appears under "Hosted by" on their page.
   */
  hostUsername?: string;
}

export const featuredWalk: Event = {
  id: 'walk-next',
  slug: 'old-pune-new-eyes',
  title: 'Old Pune, New Eyes',
  date: '2026-08-23',
  time: '7:00 AM',
  location: 'Kasba Peth · Shaniwar Wada',
  area: 'Kasba',
  description:
    'We meet early, walk slowly and photograph the old city before it wakes up.',
  theme: 'Heritage · morning light',
  image: '/images/walks/old-pune.jpg',
  imageAlt:
    'An old Pune shopfront with its shutter down, Marathi signage above and a man walking past the railings',
  price: 0,
  capacity: 30,
  status: 'filling',
  verified: false,
};

export const upcomingWalks: Event[] = [
  featuredWalk,
  {
    id: 'walk-02',
    slug: 'monsoon-city-after-rain',
    title: 'Monsoon / City After Rain',
    date: '2026-08-24',
    time: '4:30 PM',
    location: 'Deccan · FC Road',
    area: 'Deccan',
    description: 'Wet tar, umbrellas, reflected neon. Bring a cloth for your lens.',
    theme: 'Monsoon',
    image: '/images/walks/monsoon.jpg',
    imageAlt: 'Curry leaves holding beads of rain after a monsoon shower',
    price: 0,
    capacity: 25,
    status: 'open',
    verified: false,
  },
  {
    id: 'walk-03',
    slug: 'market-people-of-mandai',
    title: 'Market / People of Mandai',
    date: '2026-08-30',
    time: '8:00 AM',
    location: 'Mahatma Phule Mandai',
    area: 'Mandai',
    description: 'Portraits, produce and permission. A walk about asking first.',
    theme: 'People',
    image: '/images/walks/mandai.jpg',
    imageAlt: 'Shoppers moving through a covered flower market under orange canopies, bags full',
    price: 0,
    capacity: 20,
    status: 'filling',
    verified: false,
  },
  {
    id: 'walk-04',
    slug: 'river-light-and-reflection',
    title: 'River / Light & Reflection',
    date: '2026-09-06',
    time: '5:00 PM',
    location: 'Mula-Mutha',
    area: 'Riverside',
    description: 'Long light along the water until the bridges switch on.',
    theme: 'Nature',
    image: '/images/walks/river.jpg',
    imageAlt: 'A woman in a patterned sari sitting on the ghat steps beside the water, arches behind her',
    price: 0,
    capacity: 25,
    status: 'open',
    verified: false,
  },
];

export const experienceLevels = [
  'Beginner',
  'Enthusiast',
  'Professional',
  'Just here to explore',
] as const;

export type ExperienceLevel = (typeof experienceLevels)[number];
