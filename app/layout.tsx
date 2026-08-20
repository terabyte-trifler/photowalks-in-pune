import type { Metadata, Viewport } from 'next';
import { Instrument_Serif, Archivo, DM_Mono } from 'next/font/google';
import { featuredWalk } from '@/data/events';
import { site } from '@/data/site';
import { AuthProvider } from '@/components/auth/AuthProvider';
import './globals.css';
import { THEME_SCRIPT } from '@/lib/security/theme-script';

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
      /* The theme script writes data-theme here before React sees the page,
         so what the server sent and what React expects will differ by exactly
         that attribute. Suppressing it on this element only is the documented
         way to run a no-flash theme script; nothing else sets attributes on
         <html>. */
      suppressHydrationWarning
    >
      <head>
        {/* Runs synchronously, before the first paint. Without it the page
            renders in light and then snaps to dark once React hydrates — a
            full-screen flash on a #14110e background. Allowed by hash in the
            CSP; see lib/security/theme-script.ts. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      {/* Browser extensions — password managers, Grammarly, dark-mode tools —
          add attributes to <body> before React hydrates, and React reports the
          page it received as not matching the one it rendered. The warning is
          about the extension, not this app, but it lands in the console of
          whoever is testing and reads as a broken site.

          This suppresses mismatches on this element's own attributes only, one
          level deep. Nothing here sets any, so no real problem can hide behind
          it, and children are unaffected. */}
      <body suppressHydrationWarning>
        <a
          href="#next-walk"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[200] focus:border focus:border-foreground focus:bg-background focus:px-4 focus:py-2 focus:font-mono focus:text-meta focus:uppercase"
        >
          Skip to the next walk
        </a>

        {/* Auth state for the whole site. A client provider wrapping server
            children, exactly like RSVPProvider on the homepage: the pages it
            wraps stay server components and only the header ships this code. */}
        <AuthProvider>{children}</AuthProvider>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData()) }}
        />
      </body>
    </html>
  );
}
