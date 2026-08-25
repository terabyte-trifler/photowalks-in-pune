import Image from 'next/image';
import Link from 'next/link';
import { upcomingWalks, walksInReadingOrder } from '@/data/events';
import { getSpotsTaken, spotsRemaining } from '@/lib/walks';
import {
  cn, dayNumber, isNearlyFull, longDate, monthShort, priceLabel,
  registrationClosed, spotsLabel, weekday,
} from '@/lib/utils';
import { RSVPButton } from '@/components/rsvp/RSVPButton';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHeader } from '@/components/ui/Typography';

/**
 * An editorial index, not a row of cards: a dated list with hairline rules,
 * where hovering a row brings its photograph in from the right. Below 1024px
 * the row stacks and the photograph is dropped rather than shrunk.
 */
/* One row's worth of layout, shared by the link and the button so a closed
   walk and an open one are the same object with different behaviour. */
const ROW_CLASS =
  'grid w-full grid-cols-1 gap-x-6 gap-y-2 py-[clamp(1.5rem,3vw,2.25rem)] text-left' +
  ' transition-[background-color,padding,opacity] duration-500' +
  ' lg:grid-cols-[5rem_minmax(0,1.6fr)_minmax(0,1fr)_8rem_auto] lg:items-center' +
  ' lg:group-hover:bg-subtle lg:group-hover:px-5';

export async function UpcomingWalks() {
  const taken = await getSpotsTaken();

  return (
    <section id="walks" className="border-t border-border py-section" aria-labelledby="walks-title">
      <div className="shell">
        <SectionHeader index="03" label="Upcoming" />

        <div className="mb-[clamp(2rem,4vw,3rem)]">
          <h2 id="walks-title" className="display text-display-xl">
            Upcoming walks
          </h2>
          <p className="mt-4 font-display text-lead text-foreground-soft">
            Different streets. Different light. Same city.
          </p>
        </div>

        <Reveal className="border-t border-foreground">
          <ul>
            {walksInReadingOrder().map((walk) => {
              const remaining = spotsRemaining(walk, taken);
              const closed = registrationClosed(walk.date);
              const full = remaining <= 0;
              const low = isNearlyFull(remaining, walk.capacity);
              /* A closed walk leads to its photographs, so the action column
                 says so. "Full" only applies to a walk still ahead. */
              const label = closed ? 'Photographs' : full ? 'Full' : 'RSVP';

              const row = (
                <>
                    <span className="flex items-baseline gap-3">
                      <span className="font-display text-[1.75rem] leading-none">
                        {dayNumber(walk.date)}
                      </span>
                      <span className="meta">{monthShort(walk.date)}</span>
                    </span>

                    <span className="block">
                      <span className="display block text-display-sm transition-colors duration-300 group-hover:text-accent">
                        {walk.title}
                      </span>
                      <span className="mt-1.5 block text-[0.9375rem] leading-relaxed text-foreground-soft">
                        {walk.description}
                      </span>
                    </span>

                    <span className="meta block">
                      {weekday(walk.date)} · {walk.time}
                      <br />
                      {walk.location}
                    </span>

                    <span className="meta block">
                      {priceLabel(walk.price)}
                      <br />
                      <span className={!closed && low ? 'text-accent' : 'text-muted'}>
                        {closed ? 'Registrations closed' : spotsLabel(remaining, walk.capacity)}
                      </span>
                    </span>

                    <span className="meta inline-flex items-center gap-2.5 text-foreground">
                      {label} {!full && <span aria-hidden="true">→</span>}
                    </span>
                </>
              );

              return (
                <li key={walk.id} className="group relative border-b border-border">
                  {closed ? (
                    /* A walk that has been is not a dead row — it is the way
                       into what was made on it. Same shape, same hover, but a
                       link rather than a disabled button, because there is
                       somewhere to go. */
                    <Link
                      href={`/walks/${walk.slug}`}
                      aria-label={`${walk.title}, ${longDate(walk.date)} — registrations closed, see the photographs`}
                      /* Held back at the same opacity the disabled button had,
                         so a walk that has been still reads as past at a
                         glance — and comes up to full under the cursor, which
                         a disabled row never needed to do and this one does. */
                      className={cn(ROW_CLASS, 'opacity-50 lg:group-hover:opacity-100')}
                    >
                      {row}
                    </Link>
                  ) : (
                    <RSVPButton
                      event={walk}
                      disabled={full}
                      ariaLabel={`RSVP for ${walk.title}, ${longDate(walk.date)}`}
                      className={ROW_CLASS}
                    >
                      {row}
                    </RSVPButton>
                  )}

                  <Image
                    src={walk.image}
                    alt=""
                    aria-hidden="true"
                    width={380}
                    height={252}
                    className="pointer-events-none absolute right-24 top-1/2 z-[2] hidden h-[126px] w-[190px] -translate-y-1/2 scale-95 object-cover opacity-0 transition-[opacity,transform] duration-500 ease-editorial group-hover:scale-100 group-hover:opacity-100 xl:block"
                  />
                </li>
              );
            })}
          </ul>
        </Reveal>

        <p className="meta mt-6">
          Walks are announced first on WhatsApp · {upcomingWalks.length} walks listed
        </p>
      </div>
    </section>
  );
}
