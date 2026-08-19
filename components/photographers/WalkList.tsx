import Link from 'next/link';
import { upcomingWalks } from '@/data/events';
import { dayNumber, longDate, monthShort, priceLabel } from '@/lib/utils';
import type { WalkAttendance } from '@/lib/supabase/types';

/**
 * Walks as a dated index — the same shape as UpcomingWalks and /my-walks: a
 * big day number, the title in the display serif, hairline rules between.
 * This one is a plain list rather than a row of RSVP buttons, because these
 * walks have already been joined by somebody else.
 *
 * Time, meeting point and price still live in data/events.ts. A walk that has
 * since been edited out of that file shows its title and date only, rather
 * than inventing details for it.
 */
export function WalkList({ attendance }: { attendance: WalkAttendance[] }) {
  return (
    <ul className="border-t border-foreground">
      {attendance.map((walk) => {
        const known = upcomingWalks.find((candidate) => candidate.id === walk.event_id);

        const row = (
          <span className="grid grid-cols-[3.5rem_1fr] items-baseline gap-x-5 gap-y-2 py-[clamp(1.1rem,2vw,1.5rem)] sm:grid-cols-[3.5rem_1fr_auto]">
            <span className="text-center">
              <span className="block font-display text-[1.75rem] leading-none">
                {dayNumber(walk.event_date)}
              </span>
              <span className="meta mt-1 block">{monthShort(walk.event_date)}</span>
            </span>

            <span className="min-w-0">
              <span className="display block text-[clamp(1.15rem,2.4vw,1.6rem)] leading-tight transition-colors duration-300 group-hover:text-accent">
                {walk.event_title}
              </span>
              <span className="meta mt-1.5 block normal-case tracking-[0.08em]">
                {known ? `${known.location} · ` : ''}
                {longDate(walk.event_date)}
                {known ? ` · ${priceLabel(known.price)}` : ''}
              </span>
            </span>

            {known && (
              <span className="meta col-span-2 inline-flex items-center gap-2 text-foreground sm:col-span-1 sm:self-center">
                See the walk <span aria-hidden="true">→</span>
              </span>
            )}
          </span>
        );

        return (
          <li key={`${walk.event_id}-${walk.event_date}`} className="group border-b border-border">
            {known ? (
              /* The walks live on the homepage index; deep-link to the one
                 that matters so the RSVP dialog can open on it. */
              <Link
                href={`/?rsvp=${encodeURIComponent(known.slug)}`}
                className="block transition-[background-color,padding] duration-500 hover:bg-subtle hover:px-4"
              >
                {row}
              </Link>
            ) : (
              row
            )}
          </li>
        );
      })}
    </ul>
  );
}
