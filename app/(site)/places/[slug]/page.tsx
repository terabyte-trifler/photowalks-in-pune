import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { WalkPhotos } from '@/components/events/WalkPhotos';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHeader } from '@/components/ui/Typography';
import { places, placeBySlug, walksAtPlace } from '@/data/places';
import { site } from '@/data/site';
import { photoUrl } from '@/lib/directory';
import { listPhotosForWalks } from '@/lib/photographers';
import { breadcrumbSchema, gallerySchema, jsonLd } from '@/lib/seo';
import { dayNumber, longDate, monthShort, registrationClosed } from '@/lib/utils';

/* ============================================================================
 * /places/[slug]
 * ----------------------------------------------------------------------------
 * The durable half of a walk. A walk page is a record of one morning; this is
 * the page about the place itself, and it gathers every walk held there and
 * every photograph made on them.
 *
 * It exists because three walks have been to Mandai and three to FC Road, each
 * on its own dated page with a line of description, none of them the obvious
 * answer to "what is it like to photograph at Mandai". Now one page is.
 *
 * Photographs come from the database, so this renders per request like the
 * walk pages do. Nothing on it is behind a login.
 * ========================================================================== */
export const dynamic = 'force-dynamic';

export function generateStaticParams() {
  return places.map((place) => ({ slug: place.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const place = placeBySlug(slug);

  if (!place) return { title: `Place not found · ${site.displayName}` };

  /* The title carries the thing people actually search — a place and the word
     photowalk — rather than the site name first. */
  const title = `${place.shortName} Photowalks · Photographing ${place.name} in Pune`;

  return {
    title,
    description: place.lead,
    alternates: { canonical: `/places/${place.slug}` },
    openGraph: {
      type: 'article',
      title,
      description: place.lead,
      /* The most recent walk held here already carries an image, so a place
         shares that rather than needing an asset of its own. Falls back to the
         site card when a place has no walk yet. */
      images: [{ url: walksAtPlace(place)[0]?.image ?? site.seo.ogImage }],
    },
  };
}

export default async function PlacePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const place = placeBySlug(slug);
  if (!place) notFound();

  const walks = walksAtPlace(place);
  const shot = await listPhotosForWalks(walks.map((walk) => walk.id));
  const next = walks.find((walk) => !registrationClosed(walk.date));

  /* FAQPage, and only from the answers written in data/places.ts. Nothing here
     is generated from the walks, because structured data describing something
     the page does not actually say is the kind of thing that earns a manual
     penalty rather than a rich result. */
  const crumbs = breadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Where we walk', path: '/places' },
    { name: place.shortName, path: `/places/${place.slug}` },
  ]);

  /* Only published when there are photographs — an empty ImageGallery
     describes nothing and is worse than no block at all. */
  const gallery =
    shot.length > 0
      ? gallerySchema(
          `Photographs from ${place.name}`,
          `Photographs made at ${place.name} in Pune on photowalks run by ${site.displayName}.`,
          shot.map(({ photo, photographer }) => ({
            url: photoUrl(photo),
            caption: photo.caption,
            photographerName: photographer?.full_name ?? null,
            photographerUsername: photographer?.username ?? null,
          })),
        )
      : null;

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: place.faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  };

  return (
    <main id="main">
      <section className="border-b border-border py-section">
        <div className="shell">
          <SectionHeader index="01" label="A place we walk" />

          <Reveal>
            <h1 className="display max-w-[18ch] text-display-xl">{place.name}</h1>

            <p className="mt-[clamp(1.25rem,2.5vw,1.75rem)] max-w-[46ch] font-display text-lead text-foreground-soft">
              {place.lead}
            </p>

            <dl className="mt-[clamp(1.75rem,3.5vw,2.5rem)] max-w-[60ch]">
              {(
                [
                  ['Best light', place.bestLight],
                  ['Getting there', place.gettingThere],
                  [
                    'Walks here',
                    `${walks.length} ${walks.length === 1 ? 'walk' : 'walks'}${
                      shot.length > 0 ? ` · ${shot.length} photographs` : ''
                    }`,
                  ],
                ] as [string, string][]
              ).map(([label, value]) => (
                <div
                  key={label}
                  className="grid grid-cols-[7rem_1fr] gap-4 border-t border-border py-3"
                >
                  <dt className="meta">{label}</dt>
                  <dd className="text-[0.9375rem] text-foreground">{value}</dd>
                </div>
              ))}
            </dl>

            {next && (
              <p className="mt-[clamp(1.5rem,3vw,2.25rem)]">
                <Link href={`/walks/${next.slug}`} className="cta-solid">
                  Next walk here — {longDate(next.date)} <span aria-hidden="true">→</span>
                </Link>
              </p>
            )}
          </Reveal>
        </div>
      </section>

      {/* ---- What it is actually like to photograph -------------------- */}
      <section className="border-b border-border py-section-sm">
        <div className="shell">
          <SectionHeader index="02" label="Photographing it" />
          <Reveal className="grid gap-[clamp(1.75rem,4vw,3.5rem)] lg:grid-cols-[7fr_5fr] lg:items-start">
            <div className="max-w-[62ch]">
              {place.body.map((paragraph) => (
                <p key={paragraph.slice(0, 40)} className="mb-5 text-[1rem] leading-[1.75] text-foreground-soft">
                  {paragraph}
                </p>
              ))}
            </div>

            <div>
              <h2 className="meta mb-4">What there is to photograph</h2>
              <ul className="border-t border-foreground">
                {place.subjects.map((subject) => (
                  <li
                    key={subject}
                    className="border-b border-border py-3 text-[0.9375rem] text-foreground-soft"
                  >
                    {subject}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ---- The work made here ---------------------------------------- */}
      <section className="border-b border-border py-section-sm">
        <div className="shell">
          <SectionHeader index="03" label="Photographs made here" />
          {shot.length === 0 ? (
            <p className="state-inert">
              No photographs from {place.shortName} yet. They appear here as members file them.
            </p>
          ) : (
            <WalkPhotos
              walkTitle={place.name}
              photos={shot.map(({ photo, photographer }) => ({
                id: photo.id,
                src: photoUrl(photo),
                caption: photo.caption,
                width: photo.width,
                height: photo.height,
                photographerName: photographer?.full_name ?? null,
                photographerUsername: photographer?.username ?? null,
                photographerAvatar: photographer?.avatar_url ?? null,
              }))}
            />
          )}
        </div>
      </section>

      {/* ---- Every walk held here -------------------------------------- */}
      {walks.length > 0 && (
        <section className="border-b border-border py-section-sm">
          <div className="shell">
            <SectionHeader index="04" label="Every walk here" />
            <Reveal>
              <ul className="border-t border-foreground">
                {walks.map((walk) => {
                  const closed = registrationClosed(walk.date);
                  return (
                    <li key={walk.id} className="border-b border-border">
                      <Link
                        href={`/walks/${walk.slug}`}
                        className="group grid grid-cols-[3.5rem_1fr_auto] items-baseline gap-x-5 py-[clamp(1.1rem,2vw,1.5rem)]"
                      >
                        <span className="text-center">
                          <span className="block font-display text-[1.75rem] leading-none">
                            {dayNumber(walk.date)}
                          </span>
                          <span className="meta mt-1 block">{monthShort(walk.date)}</span>
                        </span>
                        <span className="min-w-0">
                          <span className="display block text-[clamp(1.15rem,2.4vw,1.6rem)] leading-tight transition-colors duration-300 group-hover:text-accent">
                            {walk.title}
                          </span>
                          <span className="meta mt-1.5 block normal-case tracking-[0.1em]">
                            {walk.location} · {longDate(walk.date)}
                          </span>
                        </span>
                        <span className="meta self-center text-foreground">
                          {closed ? 'Photographs' : 'RSVP'} <span aria-hidden="true">→</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </Reveal>
          </div>
        </section>
      )}

      {/* ---- Questions -------------------------------------------------- */}
      {place.faqs.length > 0 && (
        <section className="py-section-sm">
          <div className="shell">
            <SectionHeader index="05" label="Asked often" />
            <Reveal className="max-w-[62ch]">
              <dl>
                {place.faqs.map((faq) => (
                  <div key={faq.question} className="border-t border-border py-5">
                    <dt className="display mb-2 text-[clamp(1.05rem,2.2vw,1.3rem)] leading-tight">
                      {faq.question}
                    </dt>
                    <dd className="text-[0.9375rem] leading-[1.75] text-foreground-soft">
                      {faq.answer}
                    </dd>
                  </div>
                ))}
              </dl>
            </Reveal>
          </div>
        </section>
      )}

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      {gallery && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(gallery) }} />
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(faqSchema) }} />
    </main>
  );
}
