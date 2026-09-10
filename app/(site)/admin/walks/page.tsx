import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { SectionHeader } from '@/components/ui/Typography';
import { site } from '@/data/site';
import { getCurrentUser } from '@/lib/auth/session';
import { isWalkAdmin, walkRosters, type WalkRoster } from '@/lib/admin';
import { dayNumber, longDate, monthShort, registrationClosed } from '@/lib/utils';

/* ============================================================================
 * WHO IS COMING
 * ----------------------------------------------------------------------------
 * The sheet you would otherwise be assembling out of WhatsApp on the morning
 * of a walk: every walk somebody has signed up for, and for each one the
 * names, the numbers and how much photography they have done.
 *
 * Never cached and never prerendered. An attendee list is different at 9am
 * from how it was at 8, and a stale one is worse than no list — it is a person
 * standing at the meeting point who is not on your sheet.
 *
 * On 404 rather than 403: a member who guesses this URL is told the page does
 * not exist, which is true enough for them and does not advertise that there
 * is an admin surface here to keep trying at. The real boundary is the policy
 * in migration 0026 — this check only decides which answer is friendlier.
 * ========================================================================== */

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `Who is coming · ${site.displayName}`,
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

export default async function AdminWalksPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login?next=/admin/walks');
  if (!(await isWalkAdmin())) notFound();

  const rosters = await walkRosters();
  const today = todayInPune();
  const upcoming = rosters.filter((r) => r.date >= today).reverse();
  const past = rosters.filter((r) => r.date < today);
  const people = rosters.reduce((sum, r) => sum + r.attendees.length, 0);

  return (
    <section className="py-[clamp(2.5rem,6vw,4.5rem)]" aria-labelledby="admin-walks-title">
      <div className="shell max-w-[980px]">
        <SectionHeader index="01" label="Who is coming" />

        <h1 id="admin-walks-title" className="display text-display-lg">
          The sheet.
        </h1>
        <p className="mt-4 max-w-[56ch] font-display text-lead text-foreground-soft">
          {rosters.length === 0
            ? 'Nobody has joined a walk yet. Every sign-up will appear here, newest walk first.'
            : `${people} ${people === 1 ? 'person' : 'people'} across ${rosters.length} ${
                rosters.length === 1 ? 'walk' : 'walks'
              }. Phone numbers are on this page — treat it like the sheet it is.`}
        </p>

        {rosters.length > 0 && (
          <>
            <Rosters title="Still to come" index="02" rosters={upcoming} empty="No walk ahead has anybody on it yet." />
            <Rosters title="Walked" index="03" rosters={past} empty="None have been walked yet." />
          </>
        )}
      </div>
    </section>
  );
}

function Rosters({
  title,
  index,
  rosters,
  empty,
}: {
  title: string;
  index: string;
  rosters: WalkRoster[];
  empty: string;
}) {
  return (
    <div className="mt-[clamp(2.5rem,5vw,3.5rem)]">
      <SectionHeader index={index} label={title} />

      {rosters.length === 0 ? (
        <p className="text-body text-muted">{empty}</p>
      ) : (
        rosters.map((roster) => <Roster key={roster.eventId} roster={roster} />)
      )}
    </div>
  );
}

function Roster({ roster }: { roster: WalkRoster }) {
  const closed = registrationClosed(roster.date);

  return (
    <div className="mt-[clamp(1.75rem,3vw,2.5rem)]">
      {/* The walk, set like the date blocks everywhere else on the site. */}
      <div className="grid grid-cols-[3.5rem_1fr] items-baseline gap-x-5 border-b border-foreground pb-3">
        <span className="text-center">
          <span className="block font-display text-[1.75rem] leading-none">
            {dayNumber(roster.date)}
          </span>
          <span className="meta mt-1 block">{monthShort(roster.date)}</span>
        </span>

        <span className="min-w-0">
          <span className="display block text-[clamp(1.15rem,2.4vw,1.6rem)] leading-tight">
            {roster.slug ? (
              <Link href={`/walks/${roster.slug}`} className="transition-colors hover:text-accent">
                {roster.title}
              </Link>
            ) : (
              /* The walk has left data/events.ts. The title is the copy made
                 when somebody joined, which is why these rows still read
                 correctly — and it links nowhere, because there is nowhere. */
              roster.title
            )}
          </span>
          <span className="meta mt-1.5 block normal-case tracking-[0.1em]">
            {longDate(roster.date)} · {roster.attendees.length}{' '}
            {roster.attendees.length === 1 ? 'person' : 'people'}
            {closed ? ' · registrations closed' : ''}
          </span>
        </span>
      </div>

      {/* Scrolls inside itself on a phone rather than widening the page — this
          is a page somebody reads standing at a meeting point. */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] border-collapse text-body">
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="meta py-2 pr-4 text-left font-normal">Name</th>
              <th scope="col" className="meta py-2 pr-4 text-left font-normal">WhatsApp</th>
              <th scope="col" className="meta py-2 pr-4 text-left font-normal">Experience</th>
              <th scope="col" className="meta py-2 text-left font-normal">Signed up</th>
            </tr>
          </thead>
          <tbody>
            {roster.attendees.map((attendee) => (
              <tr key={attendee.rsvpId} className="border-b border-border align-baseline">
                <td className="py-2.5 pr-4">
                  {attendee.username ? (
                    <Link
                      href={`/photographers/${attendee.username}`}
                      className="transition-colors hover:text-accent"
                    >
                      {attendee.fullName}
                    </Link>
                  ) : (
                    attendee.fullName
                  )}
                </td>
                {/* A tel: link, because the point of the number is to call it. */}
                <td className="py-2.5 pr-4 font-mono text-[0.9rem]">
                  <a
                    href={`tel:${attendee.whatsapp.replace(/[^0-9+]/g, '')}`}
                    className="transition-colors hover:text-accent"
                  >
                    {attendee.whatsapp}
                  </a>
                </td>
                <td className="py-2.5 pr-4 text-foreground-soft">{attendee.experience}</td>
                <td className="py-2.5 text-foreground-soft">{longDate(attendee.joinedAt.slice(0, 10))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
