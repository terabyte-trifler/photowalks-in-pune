import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Avatar } from '@/components/navigation/Avatar';
import { StyleTags } from '@/components/photographers/StyleTags';
import { WalkList } from '@/components/photographers/WalkList';
import { WorkGrid } from '@/components/photographers/WorkGrid';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHeader } from '@/components/ui/Typography';
import { upcomingWalks } from '@/data/events';
import { site } from '@/data/site';
import { getCurrentUser } from '@/lib/auth/session';
import { websiteLabel } from '@/lib/auth/validation';
import {
  getPhotographerCard,
  listAttendance,
  listCompanions,
  listPhotos,
} from '@/lib/photographers';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import type { PhotographerCard } from '@/lib/supabase/types';
import { joinedLabel } from '@/lib/utils';
import { ShareProfile } from '@/components/photographers/ShareProfile';
import { photoUrl } from '@/lib/directory';

/* A profile changes when its owner edits it, and it shows who else was on a
   walk, so it is rendered per request. Nothing on it is behind a login. */
export const dynamic = 'force-dynamic';

/** How many frames the profile shows before "view all". */
const RECENT_WORK = 6;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const photographer = await getPhotographerCard(username);

  if (!photographer) return { title: `Photographer not found · ${site.displayName}` };

  const styles = photographer.photography_interests ?? [];
  const description =
    photographer.bio?.trim() ||
    `Explore ${photographer.full_name}'s photography, walks and interests on ${site.displayName}.` +
      (styles.length ? ` Shoots ${styles.join(', ')}.` : '');

  /* A shared profile should arrive showing the photography, not a grey box.
     Their most recent frame first, their portrait if they have not posted one
     yet, and the site's own image only if neither exists — the whole point of
     sending somebody a photographer's profile is what they take pictures of. */
  const latest = await listPhotos(photographer.id, { page: 1, pageSize: 1 });
  /* The alt travels with the image, so it has to describe whichever one was
     actually chosen — calling somebody's portrait "a photograph by" them is
     wrong in the one place a screen reader is all there is to go on. */
  const { preview, previewAlt } = latest.rows[0]
    ? {
        preview: photoUrl(latest.rows[0]),
        previewAlt:
          latest.rows[0].caption?.trim() || `A photograph by ${photographer.full_name}`,
      }
    : photographer.avatar_url
      ? { preview: photographer.avatar_url, previewAlt: photographer.full_name }
      : { preview: site.seo.ogImage, previewAlt: site.displayName };

  return {
    title: `${photographer.full_name} — ${site.displayName}`,
    description,
    alternates: { canonical: `/photographers/${photographer.username}` },
    openGraph: {
      type: 'profile',
      title: `${photographer.full_name} — ${site.displayName}`,
      description,
      url: `/photographers/${photographer.username}`,
      images: [{ url: preview, alt: previewAlt }],
    },
    /* WhatsApp and most chat apps read the OG tags above; this is for the
       card X and a few others render instead. */
    twitter: {
      card: 'summary_large_image',
      title: `${photographer.full_name} — ${site.displayName}`,
      description,
      images: [preview],
    },
    /* Public profiles are meant to be found. */
    robots: { index: true, follow: true },
  };
}

export default async function PhotographerPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  if (!isSupabaseConfigured()) notFound();

  const photographer = await getPhotographerCard(username);
  if (!photographer) notFound();

  const [viewer, work, attendance] = await Promise.all([
    getCurrentUser(),
    listPhotos(photographer.id, { page: 1, pageSize: RECENT_WORK }),
    listAttendance(photographer.id),
  ]);

  const isOwner = viewer?.id === photographer.id;
  const firstName = photographer.full_name.trim().split(/\s+/)[0];

  /* Walks are still a file, not a table, so hosting is read from there. */
  const hosted = upcomingWalks.filter(
    (walk) => walk.hostUsername?.toLowerCase() === photographer.username,
  );

  /* The edge that makes this a network: everyone else who was on those walks. */
  const companions = await listCompanions(
    attendance.map((row) => row.event_id),
    photographer.id,
  );

  return (
    <>
      <ProfileHeader photographer={photographer} isOwner={isOwner} hostedCount={hosted.length} />

      {/* ---- Recent work ------------------------------------------------- */}
      <section className="border-b border-border py-section-sm" aria-labelledby="work-title">
        <div className="shell">
          <Reveal>
            <SectionHeader index="02" label="The work" />
            <div className="mb-[clamp(1.5rem,3vw,2.25rem)] flex flex-wrap items-baseline justify-between gap-4">
              <h2 id="work-title" className="display text-display-lg">
                Recent work
              </h2>
              {work.total > RECENT_WORK && (
                <Link href={`/photographers/${photographer.username}/photos`} className="cta">
                  View all {work.total} photos <span aria-hidden="true">→</span>
                </Link>
              )}
            </div>

            {work.rows.length > 0 ? (
              /* Your own frames carry a ✕ here too, so a photograph can be
                 pulled without first going to the archive page. */
              <WorkGrid photos={work.rows} editable={isOwner} />
            ) : (
              <Empty
                title="No photographs yet"
                body={
                  isOwner
                    ? 'Nothing uploaded yet. Add a few frames and this is where they will sit.'
                    : `${firstName} has not put any photographs up yet.`
                }
                action={
                  isOwner
                    ? { label: 'Add photographs', href: `/photographers/${photographer.username}/photos` }
                    : undefined
                }
              />
            )}
          </Reveal>
        </div>
      </section>

      {/* ---- Walks attended ---------------------------------------------- */}
      <section className="border-b border-border py-section-sm" aria-labelledby="walks-title">
        <div className="shell">
          <Reveal>
            <SectionHeader index="03" label="On foot" />
            <h2 id="walks-title" className="display mb-[clamp(1.5rem,3vw,2.25rem)] text-display-lg">
              Walks
            </h2>

            {attendance.length > 0 ? (
              <WalkList attendance={attendance} />
            ) : (
              <Empty
                title="No walks attended yet"
                body={
                  isOwner
                    ? 'You have not been on a walk yet. The next one is on the homepage.'
                    : `${firstName} has not been on a walk yet.`
                }
                action={{ label: 'See the next walk', href: '/#next-walk' }}
              />
            )}
          </Reveal>
        </div>
      </section>

      {/* ---- Walks hosted — only when there are any ----------------------- */}
      {hosted.length > 0 && (
        <section className="border-b border-border py-section-sm" aria-labelledby="hosted-title">
          <div className="shell">
            <Reveal>
              <SectionHeader index="04" label="Hosting" />
              <h2 id="hosted-title" className="display mb-[clamp(1.5rem,3vw,2.25rem)] text-display-lg">
                Hosted by {firstName}
              </h2>
              <WalkList
                attendance={hosted.map((walk) => ({
                  profile_id: photographer.id,
                  event_id: walk.id,
                  event_title: walk.title,
                  event_date: walk.date,
                }))}
              />
            </Reveal>
          </div>
        </section>
      )}

      {/* ---- Who else was there ------------------------------------------ */}
      {companions.length > 0 && (
        <section className="py-section-sm" aria-labelledby="companions-title">
          <div className="shell">
            <Reveal>
              <SectionHeader index={hosted.length > 0 ? '05' : '04'} label="Walked together" />
              <h2 id="companions-title" className="display mb-[clamp(1.5rem,3vw,2.25rem)] text-display-lg">
                Also on those walks
              </h2>
              <ul className="flex flex-wrap gap-x-8 gap-y-5">
                {companions.map((person) => (
                  <li key={person.id}>
                    <Link
                      href={`/photographers/${person.username}`}
                      className="group flex items-center gap-3"
                    >
                      <Avatar src={person.avatar_url} name={person.full_name} size={38} />
                      <span>
                        <span className="block text-[0.9375rem] font-medium tracking-tight transition-colors group-hover:text-accent">
                          {person.full_name}
                        </span>
                        <span className="meta normal-case tracking-[0.08em]">
                          @{person.username}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>
        </section>
      )}
    </>
  );
}

/* ---- Header -------------------------------------------------------------- */

function ProfileHeader({
  photographer,
  isOwner,
  hostedCount,
}: {
  photographer: PhotographerCard;
  isOwner: boolean;
  hostedCount: number;
}) {
  const instagram = photographer.instagram_username;
  const website = photographer.website_url;

  return (
    <section className="border-b border-border py-[clamp(2.5rem,6vw,4.5rem)]" aria-labelledby="profile-name">
      <div className="shell">
        <SectionHeader index="01" label="Photographer" />

        <div className="grid gap-[clamp(1.5rem,4vw,3rem)] lg:grid-cols-[auto_1fr] lg:items-start">
          <Avatar src={photographer.avatar_url} name={photographer.full_name} size={128} />

          <div className="min-w-0">
            <h1 id="profile-name" className="display text-display-xl">
              {photographer.full_name}
            </h1>
            <p className="meta mt-3 normal-case tracking-[0.1em]">
              @{photographer.username}
              {photographer.city ? ` · ${photographer.city}` : ''}
            </p>

            {photographer.bio && (
              <p className="mt-[clamp(1.25rem,2.5vw,1.75rem)] max-w-[54ch] font-display text-lead text-foreground-soft">
                {photographer.bio}
              </p>
            )}

            <StyleTags
              styles={photographer.photography_interests}
              linked
              className="mt-[clamp(1.25rem,2.5vw,1.75rem)]"
            />

            {/* The rebate strip: the numbers, and only the real ones. */}
            <dl className="mt-[clamp(1.5rem,3vw,2.25rem)] grid grid-cols-2 border-t border-border sm:grid-cols-4">
              <Stat value={photographer.photo_count} label="Photographs" />
              <Stat value={photographer.walks_attended} label="Walks attended" />
              {hostedCount > 0 && <Stat value={hostedCount} label="Walks hosted" />}
              <Stat text={joinedLabel(photographer.created_at)} label="Joined" />
            </dl>

            {/* No longer conditional: every profile can be shared, so this row
                is always rendered even when somebody has added no links. */}
            <div className="mt-[clamp(1.5rem,3vw,2.25rem)] flex flex-wrap items-center gap-x-8 gap-y-4">
              {isOwner && (
                <Link href="/settings" className="cta-solid">
                  Edit profile <span aria-hidden="true">→</span>
                </Link>
              )}
              {instagram && (
                <a
                  href={`https://instagram.com/${instagram}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="cta"
                >
                  Instagram @{instagram} <span aria-hidden="true">↗</span>
                </a>
              )}
              {website && (
                <a href={website} target="_blank" rel="noreferrer noopener me" className="cta">
                  {websiteLabel(website)} <span aria-hidden="true">↗</span>
                </a>
              )}

              <ShareProfile fullName={photographer.full_name} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Stat({ value, text, label }: { value?: number; text?: string; label: string }) {
  return (
    <div className="border-b border-border py-[clamp(1rem,2vw,1.35rem)] pr-4">
      <dt className="meta">{label}</dt>
      <dd className="mt-1.5 font-display text-[clamp(1.5rem,3vw,2.25rem)] leading-none">
        {typeof value === 'number' ? value : <span className="text-[0.6em]">{text}</span>}
      </dd>
    </div>
  );
}

function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: { label: string; href: string };
}) {
  return (
    <div className="border-l-2 border-border-strong bg-subtle py-5 pl-5 pr-4">
      <p className="meta">{title}</p>
      <p className="mt-3 max-w-[52ch] text-body text-foreground-soft">{body}</p>
      {action && (
        <Link href={action.href} className="cta mt-4">
          {action.label} <span aria-hidden="true">→</span>
        </Link>
      )}
    </div>
  );
}
