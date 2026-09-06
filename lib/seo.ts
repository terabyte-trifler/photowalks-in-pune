import { site } from '@/data/site';

/* ============================================================================
 * STRUCTURED DATA
 * ----------------------------------------------------------------------------
 * One place that builds the JSON-LD blocks, so the rules about what may be
 * claimed live next to the code that claims it.
 *
 * THE RULE, AND IT IS THE ONLY ONE THAT MATTERS
 * Structured data may only describe what the page actually says. Schema that
 * asserts something a reader cannot see on the page is what earns a manual
 * action, not a rich result — and the temptation is constant, because every
 * field looks like a free place to put a keyword. data/events.ts already holds
 * this line with `verified`, which is why no Event schema is published for a
 * walk whose date and meeting point are still sample data.
 *
 * ESCAPING
 * Every block goes into a <script> through dangerouslySetInnerHTML, and
 * JSON.stringify does not escape `<`. A caption or a place name containing
 * `</script>` would otherwise close the element and everything after it would
 * be parsed as markup. jsonLd() is the only way these should be serialised.
 * ========================================================================== */

/** Serialise for a <script type="application/ld+json"> block. Always use this. */
export function jsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

const origin = (): string => site.seo.url.replace(/\/$/, '');

/** Absolute, because schema.org URLs are resolved by machines, not browsers. */
const absolute = (path: string): string =>
  /^https?:\/\//i.test(path) ? path : `${origin()}${path.startsWith('/') ? path : `/${path}`}`;

export interface Crumb {
  name: string;
  /** Site-relative path. The last crumb is the current page. */
  path: string;
}

/**
 * BreadcrumbList.
 *
 * Google renders this in place of the raw URL under a result — `pwip.in ›
 * Places › Mandai` rather than `pwip.in/places/mandai`. It does not move a
 * ranking, it moves the click-through rate on a ranking already earned, which
 * is the cheaper thing to improve.
 *
 * The trail must match the navigation a visitor can actually follow. Inventing
 * a tidier hierarchy than the site has is the usual way this goes wrong.
 */
export function breadcrumbSchema(trail: Crumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: absolute(crumb.path),
    })),
  };
}

export interface GalleryImage {
  url: string;
  caption: string | null;
  photographerName: string | null;
  photographerUsername: string | null;
}

/**
 * ImageGallery with an ImageObject per photograph.
 *
 * This is the one piece of structured data on the site describing something no
 * competitor has: photographs made by named people at a named place. Google
 * Images is a search surface of its own, and until now these frames were
 * invisible on it — no credit, no licence, nothing tying a photograph to the
 * place it was made.
 *
 * `creditText` and `creator` are what make a result attributable rather than
 * anonymous. They are only ever filled from a real profile; a photograph whose
 * photographer could not be resolved is published without a creator rather
 * than with a guessed one.
 */
export function gallerySchema(name: string, description: string, images: GalleryImage[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ImageGallery',
    name,
    description,
    image: images.map((image) => ({
      '@type': 'ImageObject',
      contentUrl: image.url,
      ...(image.caption ? { caption: image.caption } : {}),
      ...(image.photographerName
        ? {
            creditText: image.photographerName,
            creator: {
              '@type': 'Person',
              name: image.photographerName,
              ...(image.photographerUsername
                ? { url: absolute(`/photographers/${image.photographerUsername}`) }
                : {}),
            },
          }
        : {}),
    })),
  };
}

/**
 * Event, for a single walk.
 *
 * Only ever called for a walk marked `verified` in data/events.ts. That flag
 * is the promise that the date, the meeting point and the cost are real rather
 * than sample data, and publishing an Event that is not is how a site earns a
 * manual action instead of a rich result.
 *
 * WHAT IS DELIBERATELY OMITTED
 * A time. The walks carry "Morning" and "Evening", which is what the organiser
 * actually commits to, and schema.org wants an instant. A date alone is valid
 * ISO 8601 and true; inventing 07:00 to fill the field would not be.
 *
 * `offers` appears only while registration is genuinely open. A free walk that
 * has already happened still has a price of zero, and saying `InStock` about
 * it would advertise a place nobody can take.
 */
export function eventSchema(walk: {
  title: string;
  slug: string;
  date: string;
  location: string;
  description: string;
  image: string;
  price: number;
  verified: boolean;
}, { registrationOpen }: { registrationOpen: boolean }) {
  if (!walk.verified) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'Event',
    name: walk.title,
    startDate: walk.date,
    description: walk.description,
    image: absolute(walk.image),
    url: absolute(`/walks/${walk.slug}`),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: {
      '@type': 'Place',
      name: walk.location,
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Pune',
        addressRegion: 'Maharashtra',
        addressCountry: 'IN',
      },
    },
    organizer: {
      '@type': 'Organization',
      name: site.displayName,
      url: origin(),
    },
    ...(registrationOpen
      ? {
          offers: {
            '@type': 'Offer',
            price: walk.price,
            priceCurrency: 'INR',
            availability: 'https://schema.org/InStock',
            url: absolute(`/walks/${walk.slug}`),
          },
        }
      : {}),
  };
}
