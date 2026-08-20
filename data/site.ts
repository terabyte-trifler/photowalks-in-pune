/* ============================================================================
 * SITE CONFIGURATION
 * Brand, outbound links and SEO. Change WhatsApp and Instagram URLs here only.
 * ========================================================================== */

/** The origin used when nothing usable is configured. */
const DEFAULT_SITE_URL = 'https://photowalksinpune.com';

/**
 * Resolve the canonical origin for metadataBase and Open Graph URLs.
 *
 * A host that declares NEXT_PUBLIC_SITE_URL but leaves it blank hands us an
 * empty string, which `??` does not catch and `new URL('')` throws on. Anything
 * empty, scheme-less or otherwise unparseable falls back rather than failing
 * the build.
 */
function resolveSiteUrl(): string {
  const candidates = [
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXT_PUBLIC_VERCEL_URL,
    DEFAULT_SITE_URL,
  ];

  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (!trimmed) continue;

    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    try {
      return new URL(withScheme).origin;
    } catch {
      // Try the next candidate.
    }
  }

  return DEFAULT_SITE_URL;
}

export interface SiteLinks {
  instagram: string;
  instagramHandle: string;
  whatsapp: string;
  email: string;
  emailAddress: string;
}

/** Who made the site, credited once in the footer. */
export interface SiteCredit {
  name: string;
  url: string;
}

export interface SiteConfig {
  name: string;
  displayName: string;
  tagline: string;
  city: string;
  region: string;
  coordinates: string;
  established: number;
  /** Drop the existing circular logo at /public/images/logo/ and set this. */
  logo: string | null;
  links: SiteLinks;
  builtBy: SiteCredit;
  seo: {
    title: string;
    description: string;
    url: string;
    ogImage: string;
    keywords: string[];
  };
}

export const site: SiteConfig = {
  name: 'photowalksinpune',
  displayName: 'Photowalks in Pune',
  tagline: 'Walk. Photograph. Connect.',
  city: 'Pune',
  region: 'Maharashtra, India',
  coordinates: '18°31′N 73°51′E',
  established: 2026,
  logo: null,

  links: {
    instagram: 'https://instagram.com/photowalksinpune',
    instagramHandle: '@photowalksinpune',
    /* The bare invite code. The link WhatsApp hands you when you share a group
       carries ?s=sh&p=i&mlu=4&amv=2 — share-source telemetry describing how
       the link was copied, which nobody visiting the site needs to send back. */
    whatsapp: 'https://chat.whatsapp.com/FhKZBvgVqBHFa6odK1gjGF',
    email: 'mailto:hello@photowalksinpune.com',
    emailAddress: 'hello@photowalksinpune.com',
  },

  builtBy: {
    name: 'Fennr Studio',
    url: 'https://fennrstudio.com',
  },

  seo: {
    title: 'Photowalks in Pune | Walk. Photograph. Connect.',
    description:
      'Photowalks in Pune is a community for photographers and curious people exploring Pune one walk and one photograph at a time.',
    url: resolveSiteUrl(),
    ogImage: '/images/hero/pune-hero.jpg',
    keywords: [
      'photowalk Pune',
      'photowalks in Pune',
      'Pune photography community',
      'street photography Pune',
      'photography events Pune',
      'photography meetup Pune',
    ],
  },
};

/** Section order, used by the navigation and the contact-sheet rail. */
export const sections = [
  { id: 'hero', label: 'Pune' },
  { id: 'next-walk', label: 'Next walk' },
  { id: 'walks', label: 'Walks' },
  { id: 'statement', label: 'Subject' },
  { id: 'gallery', label: 'Archive' },
  { id: 'story', label: 'Story' },
  { id: 'categories', label: 'Subjects' },
  { id: 'community', label: 'Community' },
  { id: 'photographers', label: 'People' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'newsletter', label: 'Letter' },
] as const;

/**
 * `href` is either a section on the homepage (a fragment) or a route of its
 * own. SiteHeader prefixes fragments with "/" when it is not on the homepage;
 * routes are left alone. See sectionHref there.
 */
export const navigation = [
  { label: 'Walks', href: '#walks' },
  { label: 'Photographers', href: '/photographers' },
  { label: 'Stories', href: '#story' },
  { label: 'Community', href: '#community' },
  { label: 'Instagram', href: site.links.instagram, external: true },
] as const;
