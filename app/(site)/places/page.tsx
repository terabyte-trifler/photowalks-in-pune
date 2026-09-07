import type { Metadata } from 'next';
import Link from 'next/link';

import { Reveal } from '@/components/ui/Reveal';
import { SectionHeader } from '@/components/ui/Typography';
import { places, walksAtPlace } from '@/data/places';
import { site } from '@/data/site';

/* ============================================================================
 * /places
 * ----------------------------------------------------------------------------
 * The index exists so the place pages are reachable by something other than a
 * sitemap. A page nothing links to is a page a crawler is entitled to ignore,
 * and it is also one a visitor can only find by knowing the URL.
 *
 * Static: the copy comes from data/places.ts and the walk counts from
 * data/events.ts, both of which are files rather than queries.
 * ========================================================================== */

export const metadata: Metadata = {
  title: `Where we walk in Pune · ${site.displayName}`,
  description:
    'The places this community photographs — Mandai, Kasba Peth, FC Road, Camp and the hills — with what to shoot there and when the light is worth it.',
  alternates: { canonical: '/places' },
  openGraph: {
    type: 'website',
    title: `Where we walk in Pune · ${site.displayName}`,
    description: 'The places this community photographs, and what each one is like at the hour we go.',
  },
};

export default function PlacesPage() {
  return (
    <>
      <section className="border-b border-border py-section">
        <div className="shell">
          <SectionHeader index="01" label="Where we walk" />
          <Reveal>
            <h1 className="display max-w-[16ch] text-display-xl">Where we walk</h1>
            <p className="mt-[clamp(1.25rem,2.5vw,1.75rem)] max-w-[52ch] font-display text-lead text-foreground-soft">
              Seven places, walked and re-walked. Each page has what there is to photograph, when the
              light is worth being there for, and every frame the community has made on the ground.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="py-section-sm">
        <div className="shell">
          <Reveal>
            <ul className="border-t border-foreground">
              {places.map((place) => {
                const walks = walksAtPlace(place);
                return (
                  <li key={place.slug} className="border-b border-border">
                    <Link
                      href={`/places/${place.slug}`}
                      className="group grid gap-x-6 gap-y-2 py-[clamp(1.4rem,2.8vw,2rem)] sm:grid-cols-[1fr_auto] sm:items-baseline"
                    >
                      <span className="min-w-0">
                        <span className="display block text-[clamp(1.3rem,3vw,1.9rem)] leading-tight transition-colors duration-300 group-hover:text-accent">
                          {place.name}
                        </span>
                        <span className="mt-2 block max-w-[58ch] text-[0.9375rem] leading-[1.7] text-foreground-soft">
                          {place.lead}
                        </span>
                      </span>
                      <span className="meta whitespace-nowrap text-foreground">
                        {walks.length} {walks.length === 1 ? 'walk' : 'walks'}{' '}
                        <span aria-hidden="true">→</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Reveal>
        </div>
      </section>
    </>
  );
}
