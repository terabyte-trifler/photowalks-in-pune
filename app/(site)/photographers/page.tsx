import type { Metadata } from 'next';
import Link from 'next/link';
import { DirectoryControls } from '@/components/photographers/DirectoryControls';
import { PhotographerCard } from '@/components/photographers/PhotographerCard';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHeader } from '@/components/ui/Typography';
import { styleLabel } from '@/data/photography';
import { site } from '@/data/site';
import { getCurrentUser } from '@/lib/auth/session';
import {
  isDirectorySort,
  listCities,
  listPhotographers,
  type DirectorySort,
} from '@/lib/photographers';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `Photographers · ${site.displayName}`,
  description:
    'The people who walk with us — their work, the subjects they shoot and the walks they have been on.',
  alternates: { canonical: '/photographers' },
  openGraph: {
    type: 'website',
    title: `Photographers · ${site.displayName}`,
    description: 'Discover photographers from the Photowalks in Pune community.',
  },
};

export default async function PhotographersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const single = (key: string): string | undefined => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const q = single('q')?.trim() ?? '';
  const style = single('style') ?? '';
  const city = single('city') ?? '';
  const sortParam = single('sort');
  const sort: DirectorySort = isDirectorySort(sortParam) ? sortParam : 'active';
  const page = Math.max(1, Number.parseInt(single('page') ?? '1', 10) || 1);

  const configured = isSupabaseConfigured();
  const [result, cities] = configured
    ? await Promise.all([
        listPhotographers({ q, style, city, sort, page }),
        listCities(),
      ])
    : [null, []];

  /* Who is asking only matters for the wording of the empty state, which
     almost nobody sees. Asking Supabase on every directory view for something
     used that rarely is a round trip spent on nothing. */
  const viewer = result?.directoryIsEmpty ? await getCurrentUser() : null;

  return (
    <>
      {/* ---- Hero ------------------------------------------------------- */}
      <section className="border-b border-border py-[clamp(2.5rem,6vw,4.5rem)]" aria-labelledby="photographers-title">
        <div className="shell">
          <SectionHeader index="01" label="The people" />

          <h1 id="photographers-title" className="display max-w-[14ch] text-display-xl">
            Meet the photographers
          </h1>
          <div className="mt-[clamp(1.25rem,2.5vw,1.75rem)] grid gap-[clamp(1rem,3vw,3rem)] lg:grid-cols-[4fr_6fr]">
            <p className="max-w-[30ch] font-display text-lead text-foreground-soft">
              A community of people who explore Pune through photography.
            </p>
            <p className="max-w-[58ch] text-body text-foreground-soft">
              Everyone here walks the same streets and comes back with something
              different. Look through their work, see what they photograph and which
              walks they have been on — then come and meet them on the next one.
            </p>
          </div>
        </div>
      </section>

      {/* ---- Search, filters, results ------------------------------------ */}
      <section className="py-[clamp(2rem,5vw,3.5rem)]" aria-label="Photographer directory">
        <div className="shell">
          {!configured ? (
            <NotConnected />
          ) : !result ? null : (
            <>
              <DirectoryControls cities={cities} total={result.total} />

              {result.rows.length === 0 ? (
                result.directoryIsEmpty ? (
                  <FirstPhotographer signedIn={Boolean(viewer)} />
                ) : (
                  <NoMatches q={q} style={style} city={city} />
                )
              ) : (
                <>
                  {result.rankingIsEmpty && (
                    <p className="meta mt-[clamp(1.5rem,3vw,2rem)] border-l-2 border-border-strong bg-subtle py-3 pl-4 normal-case tracking-[0.06em]">
                      Nobody has walked or uploaded anything yet, so this order is not a
                      ranking — it is just everybody, newest first.
                    </p>
                  )}

                  <Reveal className="mt-[clamp(1.5rem,3vw,2.5rem)]">
                    <div className="grid gap-x-[clamp(1.5rem,4vw,3.5rem)] lg:grid-cols-2">
                      {result.rows.map((photographer, index) => (
                        <PhotographerCard
                          key={photographer.id}
                          photographer={photographer}
                          photos={result.photos.get(photographer.id) ?? []}
                          priority={index < 2}
                        />
                      ))}
                    </div>
                    <hr className="rule" />
                  </Reveal>

                  <Pagination
                    page={result.page}
                    pageCount={result.pageCount}
                    total={result.total}
                    params={{ q, style, city, sort }}
                  />
                </>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}

/* ---- Empty states -------------------------------------------------------- */

function FirstPhotographer({ signedIn }: { signedIn: boolean }) {
  return (
    <div className="mt-[clamp(2rem,5vw,3.5rem)] border-l-2 border-accent bg-subtle py-[clamp(1.5rem,3vw,2.25rem)] pl-[clamp(1.25rem,3vw,2rem)] pr-5">
      <p className="meta">Nobody yet</p>
      <p className="display mt-3 text-display-md">Be one of the first.</p>
      <p className="mt-4 max-w-[52ch] text-body text-foreground-soft">
        This directory fills up as people join. Make a profile, come on a walk, and
        put your photographs where other photographers in the city will see them.
      </p>
      <div className="mt-[clamp(1.5rem,3vw,2rem)] flex flex-wrap gap-x-8 gap-y-4">
        <Link href={signedIn ? '/settings' : '/signup'} className="cta-solid">
          {signedIn ? 'Finish your profile' : 'Create your profile'}{' '}
          <span aria-hidden="true">→</span>
        </Link>
        <Link href="/#next-walk" className="cta">
          See the next walk <span aria-hidden="true">→</span>
        </Link>
      </div>
    </div>
  );
}

function NoMatches({ q, style, city }: { q: string; style: string; city: string }) {
  const said = [
    q ? `“${q}”` : null,
    style ? styleLabel(style) : null,
    city || null,
  ].filter(Boolean);

  return (
    <div className="py-[clamp(3rem,8vw,6rem)] text-center">
      <p className="font-display text-lead text-foreground-soft">
        Nobody here matches {said.length > 0 ? said.join(' · ') : 'that'} yet.
      </p>
      <p className="meta mt-3">Try a different subject, or clear the filters.</p>
      <Link href="/photographers" className="cta mt-6">
        See everyone <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}

function NotConnected() {
  return (
    <div className="border-l-2 border-border-strong bg-subtle py-5 pl-5 pr-4">
      <p className="meta">Preview build</p>
      <p className="mt-3 max-w-[52ch] text-body text-foreground-soft">
        No Supabase project is connected, so there is no directory to show. Set
        NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to turn accounts on.
      </p>
    </div>
  );
}

/* ---- Pagination ---------------------------------------------------------- */

function Pagination({
  page,
  pageCount,
  total,
  params,
}: {
  page: number;
  pageCount: number;
  total: number;
  params: { q: string; style: string; city: string; sort: DirectorySort };
}) {
  if (pageCount <= 1) return null;

  const href = (next: number): string => {
    const query = new URLSearchParams();
    if (params.q) query.set('q', params.q);
    if (params.style) query.set('style', params.style);
    if (params.city) query.set('city', params.city);
    if (params.sort !== 'active') query.set('sort', params.sort);
    if (next > 1) query.set('page', String(next));
    const string = query.toString();
    return string ? `/photographers?${string}` : '/photographers';
  };

  return (
    <nav
      className="mt-[clamp(2rem,4vw,3rem)] flex items-center justify-between gap-4"
      aria-label="Directory pages"
    >
      {page > 1 ? (
        <Link href={href(page - 1)} className="cta">
          <span aria-hidden="true">←</span> Previous
        </Link>
      ) : (
        <span />
      )}

      <p className="meta">
        Page {page} of {pageCount} · {total} photographers
      </p>

      {page < pageCount ? (
        <Link href={href(page + 1)} className="cta">
          Next <span aria-hidden="true">→</span>
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
