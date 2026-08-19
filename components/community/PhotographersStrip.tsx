import Link from 'next/link';
import { Avatar } from '@/components/navigation/Avatar';
import { StyleLine } from '@/components/photographers/StyleTags';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHeader } from '@/components/ui/Typography';
import { photoUrl } from '@/lib/directory';
import { listFeaturedPhotographers } from '@/lib/photographers';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import Image from 'next/image';

/**
 * A short row of real people, so the homepage says "these are the
 * photographers" rather than only "these are the walks". Four at most: the
 * page is already long, and the directory is one link away.
 *
 * Renders nothing at all when there is nobody to show — an empty strip on the
 * homepage would be worse than no strip.
 */
export async function PhotographersStrip() {
  if (!isSupabaseConfigured()) return null;

  const { rows, photos } = await listFeaturedPhotographers(4);
  if (rows.length === 0) return null;

  return (
    <section
      id="photographers"
      className="border-t border-border py-section"
      aria-labelledby="photographers-strip-title"
    >
      <div className="shell">
        <Reveal>
          <SectionHeader index="09" label="The people" />

          <div className="mb-[clamp(2rem,4vw,3rem)] flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3">
            <h2 id="photographers-strip-title" className="display max-w-[16ch] text-display-xl">
              Meet the photographers
            </h2>
            <Link href="/photographers" className="cta">
              Explore all photographers <span aria-hidden="true">→</span>
            </Link>
          </div>

          <ul className="grid gap-x-[clamp(1rem,2.5vw,2rem)] gap-y-[clamp(1.5rem,3vw,2.5rem)] sm:grid-cols-2 lg:grid-cols-4">
            {rows.map((person) => {
              const frames = photos.get(person.id) ?? [];
              return (
                <li key={person.id}>
                  <Link href={`/photographers/${person.username}`} className="group block">
                    <span className="relative block aspect-[4/5] overflow-hidden bg-subtle">
                      {frames[0] ? (
                        <Image
                          src={photoUrl(frames[0])}
                          alt=""
                          fill
                          sizes="(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 90vw"
                          loading="lazy"
                          className="object-cover transition-transform duration-700 ease-editorial group-hover:scale-[1.03]"
                        />
                      ) : (
                        <span className="absolute inset-0 grid place-items-center">
                          <Avatar src={person.avatar_url} name={person.full_name} size={72} />
                        </span>
                      )}
                    </span>

                    <span className="mt-3 flex items-start gap-2.5">
                      {frames[0] && (
                        <Avatar src={person.avatar_url} name={person.full_name} size={30} />
                      )}
                      <span className="min-w-0">
                        <span className="display block text-[1.0625rem] leading-tight transition-colors duration-300 group-hover:text-accent">
                          {person.full_name}
                        </span>
                        <span className="meta mt-0.5 block truncate normal-case tracking-[0.08em]">
                          @{person.username}
                        </span>
                        <StyleLine
                          styles={person.photography_interests?.slice(0, 2) ?? null}
                          className="mt-1.5"
                        />
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
