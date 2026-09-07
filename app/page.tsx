import type { Metadata } from 'next';

import { site } from '@/data/site';

import { AnnouncementBar } from '@/components/navigation/AnnouncementBar';
import { ContactSheetRail } from '@/components/navigation/ContactSheetRail';
import { SiteHeader } from '@/components/navigation/SiteHeader';
import { Hero } from '@/components/hero/Hero';
import { FeaturedWalk } from '@/components/events/FeaturedWalk';
import { UpcomingWalks } from '@/components/events/UpcomingWalks';
import { StickyRSVP } from '@/components/events/StickyRSVP';
import { CommunityStatement } from '@/components/community/CommunityStatement';
import { PhotoGallery } from '@/components/gallery/PhotoGallery';
import { PhotoLightbox } from '@/components/gallery/PhotoLightbox';
import { PhotoStory } from '@/components/stories/PhotoStory';
import { PuneCategories } from '@/components/community/PuneCategories';
import { CommunitySection } from '@/components/community/CommunitySection';
import { PhotographersStrip } from '@/components/community/PhotographersStrip';
import { InstagramSection } from '@/components/community/InstagramSection';
import { Newsletter } from '@/components/newsletter/Newsletter';
import { SiteFooter } from '@/components/footer/SiteFooter';
import { RSVPProvider } from '@/components/rsvp/RSVPProvider';
import { GalleryProvider } from '@/components/gallery/GalleryProvider';
import { getGalleryCredits } from '@/lib/credits';

/**
 * Rebuilt every five minutes so the photographers strip picks up new members
 * without the page giving up static rendering. Nothing else here changes
 * between deploys.
 */
export const revalidate = 300;

/**
 * The homepage was the only page emitting no canonical at all. Every other one
 * states its own — /photographers, /privacy, /terms, /places and each walk —
 * because the root layout deliberately sets none: metadata there is inherited
 * rather than scoped, so a canonical in it made every page claim to be this
 * one. See the note in app/layout.tsx.
 *
 * The gap matters because the site is still reachable at its old deployment
 * hostname, which serves identical HTML. With no canonical, that copy is a
 * separate indexable page competing with pwip.in for the same content; with
 * one, both copies name pwip.in as the original. The title and description are
 * inherited as before — only the canonical is added here.
 */
export const metadata: Metadata = {
  alternates: { canonical: site.seo.url },
};

/**
 * The homepage. A server component: the two providers are client, but their
 * children are passed in from here as already-rendered server output, so only
 * the header, the RSVP triggers, the gallery grid and the forms ship JavaScript.
 *
 * When these sections graduate into /walks, /stories and /gallery, each block
 * lifts out unchanged and only this composition file is replaced.
 */
export default async function HomePage() {
  /* Read once here rather than in each client component: names come from the
     database, and the grid, the lightbox and the story dialog should all print
     the same one. Cached for five minutes, so this does not cost the page its
     static rendering. */
  const credits = await getGalleryCredits();

  return (
    <RSVPProvider>
      <GalleryProvider credits={credits}>
        <ContactSheetRail city={site.city} coordinates={site.coordinates} />
        <AnnouncementBar />
        <SiteHeader />

        <main id="main">
          <Hero />
          <FeaturedWalk />
          <UpcomingWalks />
          <CommunityStatement />
          <PhotoGallery />
          <PhotoStory />
          <PuneCategories />
          <CommunitySection />
          <PhotographersStrip />
          <InstagramSection />
          <Newsletter />
        </main>

        <SiteFooter />

        <StickyRSVP />
        <PhotoLightbox />
      </GalleryProvider>
    </RSVPProvider>
  );
}
