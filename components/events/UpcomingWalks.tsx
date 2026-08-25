import Image from 'next/image';
import { upcomingWalks, walksInReadingOrder } from '@/data/events';
import { getSpotsTaken, spotsRemaining } from '@/lib/walks';
import {
  dayNumber, isNearlyFull, longDate, monthShort, priceLabel, registrationClosed,
  spotsLabel, weekday,
} from '@/lib/utils';
import { RSVPButton } from '@/components/rsvp/RSVPButton';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHeader } from '@/components/ui/Typography';

/**
 * An editorial index, not a row of cards: a dated list with hairline rules,
 * where hovering a row brings its photograph in from the right. Below 1024px
 * the row stacks and the photograph is dropped rather than shrunk.
 */
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
              /* "Closed" first: a walk that has been and gone is not "Full",
                 whatever the count says. */
              const label = closed ? 'Closed' : full ? 'Full' : 'RSVP';

              return (
                <li key={walk.id} className="group relative border-b border-border">
                  <RSVPButton
                    event={walk}
                    disabled={full || closed}
                    ariaLabel={
                      closed
                        ? `${walk.title}, ${longDate(walk.date)} — registration closed`
                        : `RSVP for ${walk.title}, ${longDate(walk.date)}`
                    }
                    className="grid w-full grid-cols-1 gap-x-6 gap-y-2 py-[clamp(1.5rem,3vw,2.25rem)] text-left transition-[background-color,padding] duration-500 lg:grid-cols-[5rem_minmax(0,1.6fr)_minmax(0,1fr)_8rem_auto] lg:items-center lg:group-hover:bg-subtle lg:group-hover:px-5"
                  >
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
                        {closed ? 'Registration closed' : spotsLabel(remaining, walk.capacity)}
                      </span>
                    </span>

                    <span className="meta inline-flex items-center gap-2.5 text-foreground">
                      {label} {!closed && <span aria-hidden="true">→</span>}
                    </span>
                  </RSVPButton>

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
