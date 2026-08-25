import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { Avatar } from '@/components/navigation/Avatar';
import { RSVPButton } from '@/components/rsvp/RSVPButton';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHeader } from '@/components/ui/Typography';
import { allWalksNewestFirst, walkBySlug } from '@/data/events';
import { site } from '@/data/site';
import { photoUrl } from '@/lib/directory';
import { listPhotosForWalk } from '@/lib/photographers';
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
  const shot = await listPhotosForWalk(walk.id);

  return (
    <main id="main">
      <section className="border-b border-border py-section">
        <div className="shell">
          <SectionHeader index="01" label={closed ? 'A walk that has been' : 'An upcoming walk'} />

          <Reveal className="grid gap-[clamp(1.75rem,4vw,3.5rem)] lg:grid-cols-[7fr_5fr] lg:items-start">
            <article className="bg-subtle">
              <Image
                src={walk.image}
                alt={walk.imageAlt}
                width={1800}
                height={1200}
                quality={74}
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

              <Reveal className="mt-[clamp(1.75rem,3vw,2.5rem)] grid grid-cols-2 gap-[clamp(0.75rem,1.6vw,1.25rem)] md:grid-cols-3 lg:grid-cols-4">
                {shot.map(({ photo, photographer }) => (
                  <figure key={photo.id} className="group">
                    <div className="overflow-hidden bg-subtle">
                      <Image
                        src={photoUrl(photo)}
                        alt={photo.caption ?? `A photograph from ${walk.title}`}
                        width={photo.width ?? 1200}
                        height={photo.height ?? 800}
                        quality={72}
                        loading="lazy"
                        sizes="(min-width: 1024px) 24vw, (min-width: 768px) 32vw, 50vw"
                        className="aspect-square w-full object-cover transition-transform duration-700 ease-editorial group-hover:scale-105"
                      />
                    </div>

                    <figcaption className="mt-2.5">
                      {photo.caption && (
                        <p className="text-[0.875rem] leading-snug text-foreground-soft">
                          {photo.caption}
                        </p>
                      )}
                      {/* The credit is the point of showing the work at all. */}
                      {photographer?.username && (
                        <Link
                          href={`/photographers/${photographer.username}`}
                          className="mt-1 inline-flex items-center gap-2 text-[0.8125rem] text-muted transition-colors hover:text-accent"
                        >
                          <Avatar
                            src={photographer.avatar_url}
                            name={photographer.full_name ?? photographer.username}
                            size={20}
                          />
                          {photographer.full_name ?? photographer.username}
                        </Link>
                      )}
                    </figcaption>
                  </figure>
                ))}
              </Reveal>
            </>
          )}

          <div className="mt-[clamp(2rem,4vw,3rem)]">
            <Link className="cta" href="/#walks">
              All walks <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
