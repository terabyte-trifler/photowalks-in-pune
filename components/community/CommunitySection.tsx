import { site } from '@/data/site';
import { statsDisplay } from '@/data/community';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHeader } from '@/components/ui/Typography';

export function CommunitySection() {
  return (
    <section id="community" className="border-t border-border py-section" aria-labelledby="community-title">
      <div className="shell">
        <Reveal>
          <SectionHeader index="08" label="Who comes" />

          <h2 id="community-title" className="display max-w-[18ch] text-display-xl">
            This is a community, not a tour.
          </h2>

          <div className="mt-[clamp(2rem,4vw,3rem)] grid gap-[clamp(1.5rem,3vw,3rem)] lg:grid-cols-[4fr_6fr]">
            <p className="font-display text-lead text-foreground-soft">
              Some come with a mirrorless camera.
              <br />
              Some come with a phone.
              <br />
              Some know exactly what they&rsquo;re doing.
              <br />
              Some are just beginning.
            </p>

            <div>
              <p className="max-w-[52ch] text-body text-foreground-soft">
                That&rsquo;s the point. We walk together, we stop often, and nobody is
                keeping score. You don&rsquo;t need to be a photographer to come on a
                photowalk.
              </p>

              <dl className="mt-[clamp(1.75rem,3vw,2.5rem)] grid grid-cols-3 border-t border-border">
                {statsDisplay.map((stat, index) => (
                  <div
                    key={stat.label}
                    className={`border-b border-border py-[clamp(1.5rem,3vw,2.25rem)] ${
                      index > 0 ? 'border-l border-border pl-[clamp(1rem,2vw,2rem)]' : ''
                    }`}
                  >
                    <dt className="sr-only">{stat.label}</dt>
                    <dd>
                      <span className="block font-display text-[clamp(2.25rem,6vw,4rem)] leading-none">
                        {stat.value}
                      </span>
                      <span className="meta mt-2 block">{stat.label}</span>
                    </dd>
                  </div>
                ))}
              </dl>

              <div className="mt-[clamp(1.75rem,3vw,2.5rem)] flex flex-wrap gap-x-8 gap-y-5">
                <a
                  className="cta-solid"
                  href={site.links.whatsapp}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Join the WhatsApp community <span aria-hidden="true">→</span>
                </a>
                <a
                  className="cta"
                  href={site.links.instagram}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Follow {site.links.instagramHandle} <span aria-hidden="true">→</span>
                </a>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
