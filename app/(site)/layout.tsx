import type { ReactNode } from 'react';
import { RSVPProvider } from '@/components/rsvp/RSVPProvider';
import { SiteHeader } from '@/components/navigation/SiteHeader';
import { SiteFooter } from '@/components/footer/SiteFooter';

/**
 * Chrome for the pages that are not the homepage: public profiles and the
 * account screens. The header and footer are the site's own, unchanged —
 * RSVPProvider is here because the header's "Join a walk" button opens the
 * RSVP modal and needs its context, exactly as on the homepage.
 */
export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <RSVPProvider>
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </RSVPProvider>
  );
}
