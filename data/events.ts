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
  time: 'Evening',
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
  status: 'past',
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

/* ----------------------------------------------------------------------------
 * WALKS THAT HAVE BEEN
 * ----------------------------------------------------------------------------
 * The season so far. They sit in the same array as the upcoming ones because
 * they are the same thing — walksInReadingOrder puts them below what is still
 * open, most recent first, and registrationClosed already refuses RSVPs.
 *
 * On the photographs: there are six walk banners and eleven walks, so several
 * are shared. Where the place matches — Mandai for the market walks, Camp for
 * Camp, Kasba Peth for the old quarters — it is the right photograph and not a
 * compromise. Three are stand-ins and should be replaced with a frame from the
 * walk itself: the two FC Road mornings and Independence Day, marked below.
 *
 * `capacity` is carried for shape only. A closed walk shows "Registration
 * closed" where the count would go, so these numbers are never rendered.
 * -------------------------------------------------------------------------- */
  {
    id: 'walk-2026-06-20',
    slug: 'mandai-20-june',
    title: 'Mandai / Market Morning',
    date: '2026-06-20',
    time: 'Morning',
    location: 'Mahatma Phule Mandai',
    area: 'Mandai',
    description: 'The market before the crowds, when the produce is still being laid out.',
    theme: 'Markets · morning light',
    image: '/images/walks/mandai.jpg',
    imageAlt: 'Shoppers moving through a covered flower market under orange canopies, bags full',
    price: 0,
    capacity: 25,
    status: 'past',
    verified: false,
  },
  {
    id: 'walk-2026-06-27',
    slug: 'camp-27-june',
    title: 'Camp / Morning Arcades',
    date: '2026-06-27',
    time: 'Morning',
    location: 'Camp · MG Road',
    area: 'Camp',
    description: 'Arcades and old shopfronts along MG Road, photographed early.',
    theme: 'Heritage · morning light',
    image: '/images/walks/camp.jpg',
    imageAlt:
      'A wide tree-lined street in black and white, a church spire in the distance and motorbikes coming towards the camera',
    price: 0,
    capacity: 25,
    status: 'past',
    verified: false,
  },
  {
    id: 'walk-2026-07-11',
    slug: 'fc-road-11-july',
    title: 'FC Road / Saturday Morning',
    date: '2026-07-11',
    time: 'Morning',
    location: 'FC Road',
    area: 'FC Road',
    description: 'Shutters going up along FC Road, and the street filling as they do.',
    theme: 'Street',
    /* Stand-in: a street at dusk, where this was a morning walk. Replace with
       a frame from the day. */
    image: '/images/walks/balewadi.jpg',
    imageAlt: 'A busy street at dusk, scooters and people moving between lit shopfronts',
    price: 0,
    capacity: 25,
    status: 'past',
    verified: false,
  },
  {
    id: 'walk-2026-07-12',
    slug: 'fc-road-12-july',
    title: 'FC Road / Sunday Morning',
    date: '2026-07-12',
    time: 'Morning',
    location: 'FC Road',
    area: 'FC Road',
    description: 'The same street on a Sunday, slower and emptier than the day before.',
    theme: 'Street',
    /* Stand-in, as above. */
    image: '/images/walks/balewadi.jpg',
    imageAlt: 'A busy street at dusk, scooters and people moving between lit shopfronts',
    price: 0,
    capacity: 25,
    status: 'past',
    verified: false,
  },
  {
    id: 'walk-2026-07-15',
    slug: 'kasba-peth-15-july',
    title: 'Kasba Peth / Old Quarters',
    date: '2026-07-15',
    time: 'Morning',
    location: 'Kasba Peth',
    area: 'Kasba Peth',
    description: 'Wada doorways and shuttered corners in the oldest part of the city.',
    theme: 'Old city',
    image: '/images/walks/old-pune.jpg',
    imageAlt:
      'A weathered corner building in Kasba Peth, its shopfronts shuttered, a man in a white shirt walking past the railings',
    price: 0,
    capacity: 25,
    status: 'past',
    verified: false,
  },
  {
    id: 'walk-2026-07-19',
    slug: 'fc-road-shape-hunt-19-july',
    title: 'FC Road / Shape Hunt',
    date: '2026-07-19',
    time: 'Evening',
    location: 'FC Road',
    area: 'FC Road',
    description: 'One brief: find shapes. Lines, arches and shadows as the light went.',
    theme: 'Form · evening light',
    image: '/images/walks/balewadi.jpg',
    imageAlt: 'A busy street at dusk, scooters and people moving between lit shopfronts',
    price: 0,
    capacity: 25,
    status: 'past',
    verified: false,
  },
  {
    id: 'walk-2026-07-26',
    slug: 'taljai-26-july',
    title: 'Taljai / Nature Walk',
    date: '2026-07-26',
    time: 'Morning',
    location: 'Taljai Hill',
    area: 'Taljai',
    description: 'Up on the hill after the rain — leaves, light and whatever moved.',
    theme: 'Nature · monsoon',
    image: '/images/walks/monsoon.jpg',
    imageAlt: 'Curry leaves on a branch holding beads of rain after a monsoon shower',
    price: 0,
    capacity: 25,
    status: 'past',
    verified: false,
  },
  {
    id: 'walk-2026-08-08',
    slug: 'flower-market-8-august',
    title: 'Flower Market / Saturday',
    date: '2026-08-08',
    time: 'Morning',
    location: 'Mahatma Phule Mandai',
    area: 'Mandai',
    description: 'The flower section at its brightest, early, before the stock thins.',
    theme: 'Markets · colour',
    image: '/images/walks/mandai.jpg',
    imageAlt: 'Shoppers moving through a covered flower market under orange canopies, bags full',
    price: 0,
    capacity: 25,
    status: 'past',
    verified: false,
  },
  {
    id: 'walk-2026-08-09',
    slug: 'flower-market-9-august',
    title: 'Flower Market / Sunday',
    date: '2026-08-09',
    time: 'Morning',
    location: 'Mahatma Phule Mandai',
    area: 'Mandai',
    description: 'A second morning at the flowers, for everyone who could not make Saturday.',
    theme: 'Markets · colour',
    image: '/images/walks/mandai.jpg',
    imageAlt: 'Shoppers moving through a covered flower market under orange canopies, bags full',
    price: 0,
    capacity: 25,
    status: 'past',
    verified: false,
  },
  {
    id: 'walk-2026-08-15',
    slug: 'abc-independence-day-15-august',
    title: 'ABC / Independence Day',
    date: '2026-08-15',
    time: 'Morning',
    location: 'ABC',
    area: 'ABC',
    description: 'An Independence Day morning walk.',
    theme: 'Street',
    /* Stand-in. Replace with a frame from the day, and put the real meeting
       point in `location` — "ABC" is what it was called, not where it was. */
    image: '/images/walks/river.jpg',
    imageAlt:
      'A woman in a patterned sari sitting on the ghat steps beside the water, arches behind her',
    price: 0,
    capacity: 25,
    status: 'past',
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

/* ----------------------------------------------------------------------------
 * THE ORDER THE LIST IS READ IN
 * ----------------------------------------------------------------------------
 * The file is written in date order, which put the walks that had already
 * happened at the top — the first two things anybody saw were two walks they
 * could not join. So the list is arranged rather than printed as written:
 * what is still open first, soonest first, because the next walk is the thing
 * somebody came to find; then what has concluded, most recent first, which is
 * the order an archive reads in.
 *
 * Sorted rather than partitioned-and-reversed, even though the source happens
 * to be in date order today. Nothing in this file enforces that, and the same
 * argument applies here as to nextOpenWalk: a structure that quietly depends
 * on an invariant nobody maintains is a bug waiting for the day somebody adds
 * a walk in the wrong place. O(n log n) on four rows costs nothing, and it is
 * correct however the array is written.
 * -------------------------------------------------------------------------- */

/** Open walks soonest-first, then concluded walks most-recent-first. */
export function walksInReadingOrder(now: Date = new Date()): Event[] {
  const open: Event[] = [];
  const concluded: Event[] = [];

  for (const walk of upcomingWalks) {
    (registrationClosed(walk.date, now) ? concluded : open).push(walk);
  }

  /* ISO dates compare as strings, so this is a comparison of the dates. */
  open.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  concluded.sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0));

  return [...open, ...concluded];
}
