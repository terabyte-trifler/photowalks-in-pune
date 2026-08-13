/* ============================================================================
 * WALKS
 * ----------------------------------------------------------------------------
 * Set the ISO `date` and every display string is derived (see lib/utils.ts).
 * `capacity` and `spotsRemaining` drive the "N spots left" warning.
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
  spotsRemaining: number;
  status: WalkStatus;
  /** True only when the details are confirmed and publishable as schema.org. */
  verified: boolean;
}

export const featuredWalk: Event = {
  id: 'walk-next',
  slug: 'old-pune-new-eyes',
  title: 'Old Pune, New Eyes',
  date: '2026-08-16',
  time: '7:00 AM',
  location: 'Kasba Peth · Shaniwar Wada',
  area: 'Kasba',
  description:
    'We meet early, walk slowly and photograph the old city before it wakes up.',
  theme: 'Heritage · morning light',
  image: '/images/walks/old-pune.jpg',
  imageAlt:
    'Placeholder for a photograph of the old city near Shaniwar Wada, Pune, at first light',
  price: 0,
  capacity: 30,
  spotsRemaining: 11,
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
    imageAlt: 'Placeholder for a photograph of Deccan, Pune, after monsoon rain',
    price: 0,
    capacity: 25,
    spotsRemaining: 19,
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
    imageAlt: 'Placeholder for a photograph inside Mahatma Phule Mandai, Pune',
    price: 0,
    capacity: 20,
    spotsRemaining: 4,
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
    imageAlt: 'Placeholder for a photograph of the Mula-Mutha river in Pune at dusk',
    price: 0,
    capacity: 25,
    spotsRemaining: 25,
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
