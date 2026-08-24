import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { SectionHeader } from '@/components/ui/Typography';
import { CancelRsvpButton } from '@/components/rsvp/CancelRsvpButton';
import { upcomingWalks } from '@/data/events';
import { site } from '@/data/site';
import { getCurrentProfile } from '@/lib/auth/session';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import type { WalkRsvp } from '@/lib/supabase/types';
import { dayNumber, longDate, monthShort, priceLabel } from '@/lib/utils';
import { WALK_RSVP_COLUMNS } from '@/lib/supabase/columns';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `My walks · ${site.displayName}`,
  robots: { index: false, follow: false },
};

/** Today in Pune, so a walk stops being "upcoming" at the right midnight. */
function todayInPune(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

export default async function MyWalksPage() {
  const current = await getCurrentProfile();
  if (!current) redirect('/login?next=/my-walks');

  const supabase = await getSupabaseServerClient();
  const { data } = supabase
    ? await supabase
        .from('walk_rsvps')
        .select(WALK_RSVP_COLUMNS)
        .eq('profile_id', current.user.id)
        .order('event_date', { ascending: false })
    : { data: null };

  /* RLS already scopes this to the caller; the eq() above is belt and braces. */
  const rsvps: WalkRsvp[] = data ?? [];
  const today = todayInPune();
  const upcoming = rsvps.filter((r) => r.event_date >= today).reverse();
  const past = rsvps.filter((r) => r.event_date < today);

  return (
    <section className="py-[clamp(2.5rem,6vw,4.5rem)]" aria-labelledby="my-walks-title">
      <div className="shell max-w-[860px]">
        <SectionHeader index="01" label="My walks" />

        <h1 id="my-walks-title" className="display text-display-lg">
          Your walks.
        </h1>
        <p className="mt-4 max-w-[52ch] font-display text-lead text-foreground-soft">
          {rsvps.length === 0
            ? 'Every walk you join will be listed here, with its date and meeting point.'
            : 'The ones still to come, and the ones you have already walked.'}
        </p>

        {rsvps.length === 0 ? (
          <div className="mt-[clamp(2rem,4vw,3rem)] border-l-2 border-border-strong bg-subtle py-6 pl-6 pr-5">
            <p className="meta">Nothing yet</p>
            <p className="mt-3 max-w-[52ch] text-body text-foreground-soft">
              You have not joined a walk yet. The next one is on the homepage — bring
              whatever camera you have.
            </p>
            <Link href="/#next-walk" className="cta mt-5">
              See the next walk <span aria-hidden="true">→</span>
            </Link>
          </div>
        ) : (
          <>
            <WalkList
              title="Still to come"
              index="02"
              rsvps={upcoming}
              empty="Nothing coming up. The next walk is on the homepage."
              cancellable
            />
            <WalkList
              title="Walked"
              index="03"
              rsvps={past}
              empty="None yet — your first walk is still ahead of you."
            />
          </>
        )}
      </div>
    </section>
  );
}

function WalkList({
  title,
  index,
  rsvps,
  empty,
  cancellable = false,
}: {
  title: string;
  index: string;
  rsvps: WalkRsvp[];
  empty: string;
  cancellable?: boolean;
}) {
  return (
    <div className="mt-[clamp(2.5rem,5vw,3.5rem)]">
      <SectionHeader index={index} label={title} />

      {rsvps.length === 0 ? (
        <p className="text-body text-muted">{empty}</p>
      ) : (
        <ul className="border-t border-foreground">
          {rsvps.map((rsvp) => (
            <li
              key={rsvp.id}
              className="grid grid-cols-[3.5rem_1fr] items-baseline gap-x-5 gap-y-3 border-b border-border py-[clamp(1.1rem,2vw,1.5rem)] sm:grid-cols-[3.5rem_1fr_auto]"
            >
              {/* The date, set like a frame number on the contact sheet. */}
              <span className="text-center">
                <span className="block font-display text-[1.75rem] leading-none">
                  {dayNumber(rsvp.event_date)}
                </span>
                <span className="meta mt-1 block">{monthShort(rsvp.event_date)}</span>
              </span>

              <span className="min-w-0">
                <span className="display block text-[clamp(1.15rem,2.4vw,1.6rem)] leading-tight">
                  {rsvp.event_title}
                </span>
                <span className="meta mt-1.5 block normal-case tracking-[0.1em]">
                  {longDate(rsvp.event_date)}
                  {detailsFor(rsvp.event_id)}
                </span>
              </span>

              {cancellable && (
                <span className="col-span-2 sm:col-span-1 sm:justify-self-end">
                  <CancelRsvpButton rsvpId={rsvp.id} walkTitle={rsvp.event_title} />
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Time, meeting point and price still live in data/events.ts. A walk that has
 * since been edited out of that file simply shows without them rather than
 * showing something invented.
 */
function detailsFor(eventId: string): string {
  const walk = upcomingWalks.find((candidate) => candidate.id === eventId);
  if (!walk) return '';
  return ` · ${walk.time} · ${walk.location} · ${priceLabel(walk.price)}`;
}
