import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PhotoManager } from '@/components/photographers/PhotoManager';
import { WorkGrid } from '@/components/photographers/WorkGrid';
import { SectionHeader } from '@/components/ui/Typography';
import { site } from '@/data/site';
import { getCurrentUser } from '@/lib/auth/session';
import { getPhotographerCard, listPhotos, PHOTOS_PAGE_SIZE } from '@/lib/photographers';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const photographer = await getPhotographerCard(username);
  if (!photographer) return { title: `Photographer not found · ${site.displayName}` };

  return {
    title: `Photographs by ${photographer.full_name} — ${site.displayName}`,
    description: `Every photograph ${photographer.full_name} has shared with the ${site.displayName} community.`,
    alternates: { canonical: `/photographers/${photographer.username}/photos` },
  };
}

export default async function PhotographerPhotosPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const [{ username }, { page: pageParam }] = await Promise.all([params, searchParams]);
  if (!isSupabaseConfigured()) notFound();

  const photographer = await getPhotographerCard(username);
  if (!photographer) notFound();

  const page = Math.max(1, Number.parseInt(pageParam ?? '1', 10) || 1);
  const [viewer, work] = await Promise.all([
    getCurrentUser(),
    listPhotos(photographer.id, { page }),
  ]);
  const isOwner = viewer?.id === photographer.id;

  return (
    <section className="py-[clamp(2.5rem,6vw,4.5rem)]" aria-labelledby="photos-title">
      <div className="shell">
        <SectionHeader index="01" label="The archive" />

        <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3">
          <h1 id="photos-title" className="display text-display-xl">
            {photographer.full_name}
          </h1>
          <Link href={`/photographers/${photographer.username}`} className="cta">
            <span aria-hidden="true">←</span> Back to profile
          </Link>
        </div>
        <p className="meta mt-3 normal-case tracking-[0.12em]">
          @{photographer.username}
          {work.total > 0 ? ` · ${work.total} ${work.total === 1 ? 'photograph' : 'photographs'}` : ''}
        </p>

        {isOwner && (
          <div className="mt-[clamp(2rem,4vw,3rem)]">
            <PhotoManager profileId={photographer.id} photos={work.rows} total={work.total} />
          </div>
        )}

        <div className="mt-[clamp(2rem,4vw,3rem)]">
          {work.rows.length > 0 ? (
            <WorkGrid photos={work.rows} priorityCount={4} editable={isOwner} />
          ) : (
            <div className="border-l-2 border-border-strong bg-subtle py-5 pl-5 pr-4">
              <p className="meta">No photographs yet</p>
              <p className="mt-3 max-w-[52ch] text-body text-foreground-soft">
                {isOwner
                  ? 'Nothing here yet. Add a few frames above and they will appear on your profile.'
                  : `${photographer.full_name.split(' ')[0]} has not put any photographs up yet.`}
              </p>
            </div>
          )}
        </div>

        {work.pageCount > 1 && (
          <nav
            className="mt-[clamp(2rem,4vw,3rem)] flex items-center justify-between gap-4"
            aria-label="Photograph pages"
          >
            {page > 1 ? (
              <Link
                href={`/photographers/${photographer.username}/photos${page > 2 ? `?page=${page - 1}` : ''}`}
                className="cta"
              >
                <span aria-hidden="true">←</span> Previous
              </Link>
            ) : (
              <span />
            )}

            <p className="meta">
              Page {page} of {work.pageCount}
            </p>

            {page < work.pageCount ? (
              <Link
                href={`/photographers/${photographer.username}/photos?page=${page + 1}`}
                className="cta"
              >
                Next <span aria-hidden="true">→</span>
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}

        <p className="meta mt-[clamp(2rem,4vw,3rem)] normal-case tracking-[0.08em]">
          {PHOTOS_PAGE_SIZE} photographs a page, loaded as you reach them.
        </p>
      </div>
    </section>
  );
}
