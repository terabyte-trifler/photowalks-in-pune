/* ============================================================================
 * SITE CONFIGURATION
 * Brand, outbound links and SEO. Change WhatsApp and Instagram URLs here only.
 * ========================================================================== */

export interface SiteLinks {
  instagram: string;
  instagramHandle: string;
  whatsapp: string;
  email: string;
  emailAddress: string;
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
    // TODO: paste your WhatsApp community invite link
    whatsapp: 'https://chat.whatsapp.com/REPLACE_WITH_YOUR_INVITE_CODE',
    email: 'mailto:hello@photowalksinpune.com',
    emailAddress: 'hello@photowalksinpune.com',
  },

  seo: {
    title: 'Photowalks in Pune | Walk. Photograph. Connect.',
    description:
      'Photowalks in Pune is a community for photographers and curious people exploring Pune one walk and one photograph at a time.',
    url: process.env.NEXT_PUBLIC_SITE_URL ?? 'https://photowalksinpune.com',
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
  { id: 'instagram', label: 'Instagram' },
  { id: 'newsletter', label: 'Letter' },
] as const;

export const navigation = [
  { label: 'Walks', href: '#walks' },
  { label: 'Stories', href: '#story' },
  { label: 'Community', href: '#community' },
  { label: 'Instagram', href: site.links.instagram, external: true },
] as const;
