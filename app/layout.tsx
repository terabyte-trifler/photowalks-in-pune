import type { Metadata, Viewport } from 'next';
import { Instrument_Serif, Archivo, DM_Mono } from 'next/font/google';
import { featuredWalk } from '@/data/events';
import { site } from '@/data/site';
import './globals.css';

/* Two faces plus a mono for metadata. Instrument Serif holds up set very large
   and all-caps, which is where the whole page's voice comes from; Archivo runs
   the body and interface; DM Mono is reserved for the contact-sheet markings. */
const display = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  variable: '--font-display',
});

const sans = Archivo({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

const mono = DM_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  display: 'swap',
  variable: '--font-mono',
});

export const viewport: Viewport = {
  themeColor: '#F2EFE9',
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(site.seo.url),
  title: site.seo.title,
  description: site.seo.description,
  keywords: site.seo.keywords,
  applicationName: site.displayName,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: site.seo.url,
    siteName: site.displayName,
    title: site.seo.title,
    description: site.seo.description,
    images: [
      { url: site.seo.ogImage, width: 1200, height: 630, alt: `${site.displayName} — ${site.tagline}` },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: site.seo.title,
    description: site.seo.description,
    images: [site.seo.ogImage],
  },
  robots: { index: true, follow: true },
};

/**
 * Organization schema is always safe — it describes the community itself.
 * Event schema is only emitted for a walk marked `verified`, because publishing
 * an invented date, price or meeting point as structured data is worse than
 * publishing none. See the note in data/events.ts.
 */
function structuredData() {
  const schemas: Record<string, unknown>[] = [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: site.displayName,
      url: site.seo.url,
      description: site.seo.description,
      sameAs: [site.links.instagram],
      address: {
        '@type': 'PostalAddress',
        addressLocality: 'Pune',
        addressRegion: 'Maharashtra',
        addressCountry: 'IN',
      },
    },
  ];

  if (featuredWalk.verified) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'Event',
      name: featuredWalk.title,
      startDate: featuredWalk.date,
      eventStatus: 'https://schema.org/EventScheduled',
      eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
      description: featuredWalk.description,
      location: {
        '@type': 'Place',
        name: featuredWalk.location,
        address: {
          '@type': 'PostalAddress',
          addressLocality: 'Pune',
          addressRegion: 'Maharashtra',
          addressCountry: 'IN',
        },
      },
      organizer: { '@type': 'Organization', name: site.displayName, url: site.seo.url },
      offers: {
        '@type': 'Offer',
        price: featuredWalk.price,
        priceCurrency: 'INR',
        availability: 'https://schema.org/InStock',
        url: site.seo.url,
      },
    });
  }

  return schemas;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en-IN"
      className={`${display.variable} ${sans.variable} ${mono.variable}`}
    >
      <body>
        <a
          href="#next-walk"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[200] focus:border focus:border-foreground focus:bg-background focus:px-4 focus:py-2 focus:font-mono focus:text-meta focus:uppercase"
        >
          Skip to the next walk
        </a>

        {children}

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData()) }}
        />
      </body>
    </html>
  );
}
