import Image from 'next/image';
import { walkToFeature } from '@/data/events';
import { site } from '@/data/site';
import { longDate, priceLabel, registrationClosed, spotsLabel, isNearlyFull } from '@/lib/utils';
import { getSpotsTaken, spotsRemaining } from '@/lib/walks';
import { RSVPButton } from '@/components/rsvp/RSVPButton';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHeader } from '@/components/ui/Typography';

/** Server component. Everything above this exists to get someone here. */
export async function FeaturedWalk() {
  /* The next walk still taking people, or the most recent one if none is. */
  const walk = walkToFeature();

  /* Only when there are no walks in the file at all. */
  if (!walk) {
    return (
      <section
        id="next-walk"
        className="border-t border-border py-section"
        aria-labelledby="next-walk-title"
      >
        <div className="shell">
          <SectionHeader index="02" label="Next walk" />
          <Reveal>
            <h2 id="next-walk-title" className="display max-w-[18ch] text-display-xl">
              The next one is being planned.
            </h2>
            <p className="mt-6 max-w-[46ch] font-display text-lead text-foreground-soft">
              Walks are announced first on WhatsApp, usually a week or so ahead —
              that is where the date lands before it reaches this page.
            </p>
            <div className="mt-[clamp(1.5rem,3vw,2.25rem)]">
              <a
                className="cta-solid"
                href={site.links.whatsapp}
                target="_blank"
                rel="noreferrer noopener"
              >
                Join the WhatsApp community <span aria-hidden="true">→</span>
              </a>
            </div>
          </Reveal>
        </div>
      </section>
    );
  }

  /* Counted from real RSVPs, not typed into data/events.ts. */
  const remaining = spotsRemaining(walk, await getSpotsTaken());
  const low = isNearlyFull(remaining, walk.capacity);

  /* True when this is the most recent walk rather than the next one — every
     walk has been. The section renames itself so nobody reads a walk that is
     over as one they can still join. */
  const closed = registrationClosed(walk.date);

  const facts: [string, string][] = [
    /* The full date, not just the weekday. "Saturday · Afternoon" is fine on a
       page you are already reading this week and useless in a screenshot, a
       shared link, or three weeks from now — and this is the one line somebody
       checks before deciding to come. */
    ['Date', `${longDate(walk.date)} · ${walk.time}`],
    ['Meeting', walk.location],
    ['Cost', `${priceLabel(walk.price)} · All cameras welcome`],
    /* A spot count is meaningless once the walk has been, and the line below
       already says registrations are closed — two of them is one too many. */
    ...(closed
      ? []
      : ([['Spots', spotsLabel(remaining, walk.capacity)]] as [string, string][])),
  ];

  return (
    <section id="next-walk" className="border-t border-border py-section" aria-labelledby="next-walk-title">
      <div className="shell">
        <SectionHeader index="02" label={closed ? 'Latest walk' : 'Next walk'} />

        <Reveal className="grid gap-[clamp(1.75rem,4vw,3.5rem)] lg:grid-cols-[7fr_5fr] lg:items-start">
          <article className="bg-subtle">
            <Image
              src={walk.image}
              alt={walk.imageAlt}
              width={1800}
              height={1200}
              quality={74}
              sizes="(min-width: 1024px) 58vw, 100vw"
              className="aspect-[3/2] w-full object-cover"
            />
          </article>

          <div>
            <h2 id="next-walk-title" className="display text-display-xl">
              {walk.title}
            </h2>

            <dl className="my-[clamp(1.5rem,3vw,2.25rem)]">
              {facts.map(([label, value], index) => (
                <div
                  key={label}
                  className={`grid grid-cols-[7rem_1fr] items-baseline gap-4 border-t border-border py-3.5 ${
                    index === facts.length - 1 ? 'border-b' : ''
                  }`}
                >
                  <dt className="meta">{label}</dt>
                  <dd
                    className={`meta ${
                      label === 'Spots' && low && !closed ? 'text-accent' : 'text-foreground'
                    }`}
                  >
                    {value}
                  </dd>
                </div>
              ))}
            </dl>

            <p className="max-w-[34ch] font-display text-lead text-foreground-soft">
              {walk.description}
            </p>

            <div className="mt-[clamp(1.5rem,3vw,2.25rem)]">
              {closed ? (
                /* Past six on the day of the walk. No call to action: there is
                   nothing here to act on, and a button that goes somewhere
                   else reads as a consolation prize — so it is a panel that
                   states the fact, sized like the button it replaces. */
                <p className="state-inert">Registrations closed</p>
              ) : (
                <RSVPButton event={walk} className="cta-solid">
                  I&rsquo;m in <span aria-hidden="true">→</span>
                </RSVPButton>
              )}
            </div>

            {!closed && (
              <p className="meta mt-4">{longDate(walk.date)} · No experience needed</p>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
