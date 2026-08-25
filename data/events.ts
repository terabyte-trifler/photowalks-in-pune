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

import { registrationClosed } from '@/lib/utils';

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
 *
 * NOT what section 02 shows. This is the first entry of `upcomingWalks`, and
 * once it has been it is simply a past walk like any other; the page leads with
 * whatever `nextOpenWalk()` returns. Import that, not this.
 */
export const featuredWalk: Event = {
  id: 'walk-next',
  slug: 'camp-colonial-lines',
  title: 'Camp / Colonial Lines',
  date: '2026-08-22',
  /* A part of the day rather than a clock time — `time` is rendered as free
     text everywhere it appears, so "Afternoon" reads correctly beside the
     weekday without any special handling. The exact hour goes out on WhatsApp,
     where it can be changed on the morning without a deploy. */
  time: 'Afternoon',
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
    date: '2026-08-23',
    time: 'Afternoon',
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

/* ----------------------------------------------------------------------------
 * WHICH WALK SECTION 02 LEADS WITH
 * ----------------------------------------------------------------------------
 * It used to lead with `featuredWalk`, a fixed reference — so the morning after
 * that walk, the top of the page was still advertising it. Now the walk is
 * chosen: the earliest one still taking people, by the same 18:00 IST cutoff
 * the RSVP buttons use.
 *
 * ON THE CHOICE OF STRUCTURE
 * A queue is the obvious fit — the walks are in date order, so shift the front
 * one off as it passes — and it is the wrong one here, for a reason that has
 * nothing to do with how fast it is. Rendering is stateless: nothing survives
 * between requests, so there is no queue to have been shifted. Making one
 * module-level and mutating it would be worse than useless, because module
 * state in a server outlives the request and is shared by everybody it renders
 * — one visitor arriving after six would pop the walk for every other visitor
 * that worker went on to serve.
 *
 * So the answer is recomputed each time, which makes this a single-pass
 * minimum: O(n) time, O(1) space, no allocation, one comparison per walk. That
 * is already optimal for the operation, because a walk that has closed cannot
 * be recognised without looking at it — any structure claiming better has to
 * have been maintained by somebody, which is the thing that cannot happen here.
 *
 * Sorting first would be O(n log n) to answer a question that does not need the
 * order. Binary search would be O(log n) but only holds while the array is
 * sorted by date, which nothing in this file enforces — an out-of-order entry
 * would silently skip a walk. The scan does not care.
 *
 * n is four.
 * -------------------------------------------------------------------------- */

/**
 * The earliest walk still taking people, or null when every one has closed.
 *
 * `now` is a parameter so the transition either side of six can be tested
 * without waiting for the evening.
 */
export function nextOpenWalk(now: Date = new Date()): Event | null {
  let next: Event | null = null;

  for (const walk of upcomingWalks) {
    if (registrationClosed(walk.date, now)) continue;
    /* ISO dates are lexicographically ordered, so `<` on the strings is a
       comparison of the dates. No parsing, and no timezone to get wrong. */
    if (next === null || walk.date < next.date) next = walk;
  }

  return next;
}
