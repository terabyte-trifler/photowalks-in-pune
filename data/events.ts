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

/*
 * The id stays `walk-next` through any change of place or name. Five people
 * have already joined this one, and walk_rsvps rows point at the id — renaming
 * it would strand their spots.
 */
export const featuredWalk: Event = {
  id: 'walk-next',
  slug: 'camp-colonial-lines',
  title: 'Camp / Colonial Lines',
  date: '2026-08-23',
  time: '4:00 PM',
  location: 'Camp · MG Road',
  area: 'Camp',
  description:
    'Arcades, bakeries and old shopfronts, photographed as the afternoon light comes down MG Road.',
  theme: 'Heritage · afternoon light',
  image: '/images/walks/camp.jpg',
  imageAlt:
    'A wide tree-lined street in black and white, a church spire in the distance and motorbikes coming towards the camera',
  price: 0,
  capacity: 30,
  status: 'filling',
  verified: false,
};

export const upcomingWalks: Event[] = [
  featuredWalk,
  {
    id: 'walk-02',
    slug: 'balewadi-high-street',
    title: 'Balewadi / The New City',
    date: '2026-08-24',
    time: '4:30 PM',
    location: 'Balewadi High Street',
    area: 'Balewadi',
    description:
      'Glass, signage and evening light — the Pune that was built this decade.',
    theme: 'Contemporary · evening',
    image: '/images/walks/balewadi.jpg',
    imageAlt:
      'A busy street at dusk, scooters and people moving between lit shopfronts',
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
