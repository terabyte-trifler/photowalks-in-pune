import type { Metadata } from 'next';
import { Picture } from '@/components/media/Picture';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { WalkPhotos } from '@/components/events/WalkPhotos';
import { RSVPButton } from '@/components/rsvp/RSVPButton';
import { Avatar } from '@/components/navigation/Avatar';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHeader } from '@/components/ui/Typography';
import { allWalksNewestFirst, walkBySlug } from '@/data/events';
import { placeForWalk } from '@/data/places';
import { notesForWalk } from '@/data/walk-notes';
import { site } from '@/data/site';
import { photoUrl } from '@/lib/directory';
import { listPhotosForWalk, listWalkers } from '@/lib/photographers';
import { breadcrumbSchema, eventSchema, gallerySchema, jsonLd } from '@/lib/seo';
import { longDate, priceLabel, registrationClosed } from '@/lib/utils';

/* The photographs come from the database and appear the moment somebody files
   one, so this is rendered per request rather than baked. Nothing on it is
   behind a login. */
export const dynamic = 'force-dynamic';

/** Every walk is a real page, so they can all be built ahead of a request. */
export function generateStaticParams() {
  return allWalksNewestFirst().map((walk) => ({ slug: walk.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const walk = walkBySlug(slug);

  if (!walk) return { title: `Walk not found · ${site.displayName}` };

  return {
    title: `${walk.title} · ${site.displayName}`,
    description: walk.description,
    alternates: { canonical: `/walks/${walk.slug}` },
    openGraph: {
      title: `${walk.title} — ${longDate(walk.date)}`,
      description: walk.description,
      images: [{ url: walk.image }],
    },
  };
}

export default async function WalkPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const walk = walkBySlug(slug);
  if (!walk) notFound();

  const closed = registrationClosed(walk.date);
  const place = placeForWalk(walk);

  /* Null unless the walk is marked verified — see the note in lib/seo.ts. */
  const event = eventSchema(walk, { registrationOpen: !closed });

  /* The trail a visitor can actually follow: a walk sits under its place, and
     the walk page links up to it. */
  const crumbs = breadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Where we walk', path: '/places' },
    ...(place ? [{ name: place.shortName, path: `/places/${place.slug}` }] : []),
    { name: walk.title, path: `/walks/${walk.slug}` },
  ]);

  const [shot, walkers] = await Promise.all([
    listPhotosForWalk(walk.id),
    listWalkers(walk.id),
  ]);
  const notes = notesForWalk(walk.slug);
  const gallery =
    shot.length > 0
      ? gallerySchema(
          `Photographs from ${walk.title}`,
          `Photographs made on ${walk.title} at ${walk.location}, Pune.`,
          shot.map(({ photo, photographer }) => ({
            url: photoUrl(photo),
            caption: photo.caption,
            photographerName: photographer?.full_name ?? null,
            photographerUsername: photographer?.username ?? null,
          })),
        )
      : null;

  return (
    <main id="main">
      <section className="border-b border-border py-section">
        <div className="shell">
          <SectionHeader index="01" label={closed ? 'A walk that has been' : 'An upcoming walk'} />

          <Reveal className="grid gap-[clamp(1.75rem,4vw,3.5rem)] lg:grid-cols-[7fr_5fr] lg:items-start">
            <article className="bg-subtle">
              <Picture
                src={walk.image}
                alt={walk.imageAlt}
                width={1800}
                height={1200}
                priority
                sizes="(min-width: 1024px) 58vw, 100vw"
                className="aspect-[3/2] w-full object-cover"
              />
            </article>

            <div>
              <h1 className="display text-display-xl">{walk.title}</h1>

              <dl className="my-[clamp(1.5rem,3vw,2rem)]">
                {(
                  [
                    ['Date', `${longDate(walk.date)} · ${walk.time}`],
                    ['Meeting', walk.location],
                    ['Cost', `${priceLabel(walk.price)} · All cameras welcome`],
                  ] as [string, string][]
                ).map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[6rem_1fr] gap-4 border-t border-border py-3">
                    <dt className="meta">{label}</dt>
                    <dd className="text-[0.9375rem] text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>

              <p className="max-w-[34ch] font-display text-lead text-foreground-soft">
                {walk.description}
              </p>

              {/* Up to the place. A walk is one morning; the place page holds
                  every walk held there and every frame made on them, and is
                  where somebody who arrived looking for the location rather
                  than the date actually wants to be. */}
              {notes.length > 0 && (
                <div className="mt-6 max-w-[46ch]">
                  {notes.map((paragraph) => (
                    <p
                      key={paragraph.slice(0, 40)}
                      className="mb-4 text-[0.9375rem] leading-[1.75] text-foreground-soft"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              )}

              {place && (
                <p className="mt-5 text-[0.9375rem]">
                  <Link
                    href={`/places/${place.slug}`}
                    className="border-b border-border pb-0.5 text-foreground transition-colors duration-300 hover:border-accent hover:text-accent"
                  >
                    More about photographing {place.shortName}{' '}
                    <span aria-hidden="true">→</span>
                  </Link>
                </p>
              )}

              <div className="mt-[clamp(1.5rem,3vw,2.25rem)]">
                {closed ? (
                  <p className="state-inert">Registrations closed</p>
                ) : (
                  <RSVPButton event={walk} className="cta-solid">
                    I&rsquo;m in <span aria-hidden="true">→</span>
                  </RSVPButton>
                )}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="py-section">
        <div className="shell">
          <SectionHeader index="02" label="From this walk" />

          {shot.length === 0 ? (
            /* Said plainly rather than hidden. A walk with no photographs yet
               is the normal state of a walk that has not happened, and on one
               that has it is an invitation to the people who were there. */
            <Reveal>
              <h2 className="display max-w-[20ch] text-display-lg">
                {closed ? 'Nobody has filed anything from this one yet.' : 'The photographs come after.'}
              </h2>
              <p className="mt-5 max-w-[46ch] font-display text-lead text-foreground-soft">
                {closed
                  ? 'If you were there, your frames belong here — add them from your profile and choose this walk.'
                  : 'Once the walk has been, whatever the group made is filed here by the people who made it.'}
              </p>
            </Reveal>
          ) : (
            <>
              <Reveal>
                <h2 className="display text-display-lg">
                  {shot.length} {shot.length === 1 ? 'photograph' : 'photographs'}
                </h2>
              </Reveal>

              <WalkPhotos
                walkTitle={walk.title}
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
            </>
          )}

          <div className="mt-[clamp(2rem,4vw,3rem)]">
            <Link className="cta" href="/#walks">
              All walks <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>
    
      {/* ---- who was there ------------------------------------------- */}
      {walkers.length > 0 && (
        <section className="border-t border-border py-section-sm" aria-labelledby="walkers-title">
          <div className="shell">
            <SectionHeader index="03" label="Who walked it" />
            <Reveal>
              <h2 id="walkers-title" className="display mb-[clamp(1.5rem,3vw,2.25rem)] text-display-lg">
                {walkers.length} {walkers.length === 1 ? 'photographer' : 'photographers'} came
              </h2>
              <ul className="flex flex-wrap gap-x-8 gap-y-5">
                {walkers.map((person) => (
                  <li key={person.id}>
                    <Link
                      href={`/photographers/${person.username}`}
                      className="group flex items-center gap-3"
                    >
                      <Avatar src={person.avatar_url} name={person.full_name} size={36} />
                      <span className="min-w-0">
                        <span className="block text-[0.9375rem] leading-tight transition-colors duration-300 group-hover:text-accent">
                          {person.full_name}
                        </span>
                        <span className="meta normal-case tracking-[0.1em]">@{person.username}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>
      )}

      {event && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(event) }} />
      )}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(crumbs) }} />
      {gallery && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(gallery) }} />
      )}
    </main>
  );
}
