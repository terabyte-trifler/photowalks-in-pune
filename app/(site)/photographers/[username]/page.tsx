import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Avatar } from '@/components/navigation/Avatar';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHeader } from '@/components/ui/Typography';
import { categories } from '@/data/photos';
import { site } from '@/data/site';
import { getCurrentUser } from '@/lib/auth/session';
import { getProfileByUsername } from '@/lib/profiles';
import { joinedLabel } from '@/lib/utils';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import type { Profile } from '@/lib/supabase/types';

/* Profiles change when their owner edits them, so they are rendered per
   request. Nothing here is behind a login: a photography community's profiles
   are public, which is also why the RLS select policy is `using (true)`. */
export const dynamic = 'force-dynamic';

const CATEGORY_LABELS = new Map(categories.map((category) => [category.id, category.label]));

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfileByUsername(username);

  if (!profile) return { title: `Photographer not found · ${site.displayName}` };

  return {
    title: `${profile.full_name} · ${site.displayName}`,
    description:
      profile.bio ?? `${profile.full_name} photographs in ${profile.city} with ${site.displayName}.`,
    alternates: { canonical: `/photographers/${profile.username}` },
    openGraph: {
      type: 'profile',
      title: `${profile.full_name} · ${site.displayName}`,
      description: profile.bio ?? `Walking and photographing ${profile.city}.`,
    },
  };
}

export default async function PhotographerPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;

  if (!isSupabaseConfigured()) notFound();

  const profile = await getProfileByUsername(username);
  if (!profile) notFound();

  const viewer = await getCurrentUser();
  const isOwner = viewer?.id === profile.id;

  return (
    <>
      <ProfileHeader profile={profile} isOwner={isOwner} />

      <ContributionSection
        index="02"
        label="Walks"
        title="Walks attended"
        empty={
          isOwner
            ? 'You have not been on a walk yet. The next one is on the homepage.'
            : `${firstName(profile.full_name)} has not been on a walk yet.`
        }
        action={{ label: 'See the next walk', href: '/#next-walk' }}
      />

      <ContributionSection
        index="03"
        label="Archive"
        title="Photographs"
        empty={
          isOwner
            ? 'Nothing here yet. Uploads open when the archive does.'
            : `No photographs from ${firstName(profile.full_name)} in the archive yet.`
        }
        action={{ label: 'Browse the archive', href: '/#gallery' }}
      />

      <ContributionSection
        index="04"
        label="Challenges"
        title="Challenges"
        empty="Photography challenges have not started yet. They will show up here."
      />
    </>
  );
}

function ProfileHeader({ profile, isOwner }: { profile: Profile; isOwner: boolean }) {
  const interests = profile.photography_interests ?? [];

  return (
    <section className="border-b border-border py-[clamp(2.5rem,6vw,4.5rem)]" aria-labelledby="profile-name">
      <div className="shell">
        <SectionHeader index="01" label="Photographer" />

        <div className="grid gap-[clamp(1.5rem,4vw,3rem)] lg:grid-cols-[auto_1fr] lg:items-start">
          {/* Avatar sizes itself from `size` inline, so it takes one number
              rather than responsive classes that an inline style would win
              against. 112px reads at 375px and at 1920px. */}
          <Avatar src={profile.avatar_url} name={profile.full_name} size={112} />

          <div>
            <h1 id="profile-name" className="display text-display-lg">
              {profile.full_name}
            </h1>
            <p className="meta mt-3 normal-case tracking-[0.1em]">@{profile.username}</p>

            {profile.bio && (
              <p className="mt-[clamp(1.25rem,2.5vw,1.75rem)] max-w-[56ch] font-display text-lead text-foreground-soft">
                {profile.bio}
              </p>
            )}

            {/* The rebate strip: the metadata that sits under a photograph on
                a contact sheet, here under the person. */}
            <dl className="mt-[clamp(1.5rem,3vw,2.25rem)] grid grid-cols-2 border-t border-border sm:grid-cols-3">
              <Fact label="City" value={profile.city} />
              <Fact label="Joined" value={joinedLabel(profile.created_at)} />
              <Fact
                label="Instagram"
                value={
                  profile.instagram_username ? (
                    <a
                      href={`https://instagram.com/${profile.instagram_username}`}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="transition-colors hover:text-accent"
                    >
                      @{profile.instagram_username}
                    </a>
                  ) : (
                    <span className="text-muted">Not linked</span>
                  )
                }
              />
            </dl>

            <div className="mt-[clamp(1.5rem,3vw,2rem)]">
              <p className="meta mb-3">Subjects</p>
              {interests.length > 0 ? (
                <ul className="flex flex-wrap gap-2">
                  {interests.map((interest) => (
                    <li
                      key={interest}
                      className="border border-border-strong px-3 py-1.5 font-mono text-micro uppercase text-foreground-soft"
                    >
                      {CATEGORY_LABELS.get(interest) ?? interest}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[0.9375rem] text-muted">
                  {isOwner
                    ? 'You have not picked any subjects yet.'
                    : 'No subjects picked yet.'}
                </p>
              )}
            </div>

            {isOwner && (
              <div className="mt-[clamp(1.75rem,3vw,2.5rem)] flex flex-wrap gap-x-8 gap-y-4">
                <Link href="/settings" className="cta-solid">
                  Edit profile <span aria-hidden="true">→</span>
                </Link>
                <Link href="/my-walks" className="cta">
                  My walks <span aria-hidden="true">→</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="border-b border-border py-[clamp(1rem,2vw,1.35rem)] pr-4">
      <dt className="meta">{label}</dt>
      <dd className="mt-1.5 text-[0.9375rem] text-foreground-soft">{value}</dd>
    </div>
  );
}

/**
 * The three things a profile will eventually hold. They are empty because
 * nothing has been walked, uploaded or judged yet — no invented counts, in
 * keeping with the rest of the site (see data/community.ts).
 */
function ContributionSection({
  index,
  label,
  title,
  empty,
  action,
}: {
  index: string;
  label: string;
  title: string;
  empty: string;
  action?: { label: string; href: string };
}) {
  return (
    <section className="border-b border-border py-section-sm" aria-labelledby={`section-${index}`}>
      <div className="shell">
        <Reveal>
          <SectionHeader index={index} label={label} />
          <h2 id={`section-${index}`} className="display text-display-md">
            {title}
          </h2>

          <div className="mt-[clamp(1.25rem,2.5vw,1.75rem)] border-l-2 border-border-strong bg-subtle py-5 pl-5 pr-4">
            <p className="max-w-[52ch] text-body text-foreground-soft">{empty}</p>
            {action && (
              <Link href={action.href} className="cta mt-4">
                {action.label} <span aria-hidden="true">→</span>
              </Link>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}

const firstName = (fullName: string): string => fullName.trim().split(/\s+/)[0];
