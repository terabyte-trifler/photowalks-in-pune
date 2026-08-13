import { featuredWalk } from '@/data/events';
import { site } from '@/data/site';
import { RSVPButton } from '@/components/rsvp/RSVPButton';
import { HeroImage } from './HeroImage';

/**
 * Server component. Only the photograph's entrance and the RSVP trigger are
 * client islands.
 */
export function Hero() {
  return (
    <section id="hero" aria-labelledby="hero-title">
      <div className="relative h-[clamp(520px,82vh,880px)] overflow-hidden bg-night">
        <HeroImage
          src="/images/hero/pune-hero.jpg"
          alt="Placeholder for a photograph of early morning in the old city of Pune"
        />

        {/* Scrim, so the type holds contrast over any photograph put here. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(to_top,rgba(10,9,8,0.82)_0%,rgba(10,9,8,0.18)_46%,rgba(10,9,8,0.34)_100%)]"
        />

        <div className="shell relative flex h-full flex-col justify-between py-[clamp(1.5rem,4vw,3rem)] text-[#F5F1EA]">
          <div className="flex justify-between gap-4 font-mono text-micro uppercase tracking-[0.2em] text-[rgba(245,241,234,0.72)]">
            <span>{site.city} · India</span>
            <span>{site.coordinates}</span>
          </div>

          <div>
            <h1 id="hero-title" className="display text-hero text-[#F7F3EC]">
              <span className="block">Photowalks</span>
              <span className="block">in Pune</span>
            </h1>

            <p className="mt-[clamp(1rem,2vw,1.6rem)] max-w-[34ch] font-mono text-[clamp(0.625rem,1.3vw,0.8125rem)] uppercase leading-[1.9] tracking-[0.22em] text-[rgba(245,241,234,0.86)]">
              We walk. We photograph. We see the city differently.
            </p>

            <div className="mt-[clamp(1.75rem,3vw,2.75rem)] flex flex-wrap gap-x-10 gap-y-5">
              <RSVPButton event={featuredWalk} className="cta text-[#F5F1EA]">
                Join the next walk <span aria-hidden="true">→</span>
              </RSVPButton>
              <a href="#statement" className="cta text-[#F5F1EA]">
                Explore the community <span aria-hidden="true">↓</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Standfirst, sitting under the photograph like a caption block. */}
      <div className="shell grid gap-[clamp(1.5rem,3vw,3rem)] py-[clamp(2.5rem,5vw,4.5rem)] lg:grid-cols-[4fr_6fr]">
        <p className="max-w-[26ch] font-display text-lead text-foreground-soft">
          A community for people who like to walk with a camera.
        </p>
        <p className="max-w-[62ch] text-body text-foreground-soft">
          From the old streets of Pune to monsoon mornings, neighbourhoods, markets,
          architecture and everything in between — we explore the city one frame at a
          time. Bring whatever camera you have.
        </p>
      </div>
    </section>
  );
}
