import Image from 'next/image';
import { featuredStory } from '@/data/photos';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHeader } from '@/components/ui/Typography';
import { StoryDialog } from './StoryDialog';

export function PhotoStory() {
  return (
    <section id="story" className="border-t border-border py-section" aria-labelledby="story-title">
      <div className="shell">
        <Reveal>
          <SectionHeader index="06" label={featuredStory.label} />

          <h2 id="story-title" className="display max-w-[14ch] text-display-xl">
            {featuredStory.title}
          </h2>

          <figure className="my-[clamp(2rem,4vw,3rem)]">
            <Image
              src={featuredStory.image}
              alt={featuredStory.imageAlt}
              width={1800}
              height={1012}
              quality={74}
              loading="lazy"
              sizes="100vw"
              className="w-full"
            />
          </figure>

          <div className="grid gap-[clamp(1.5rem,3vw,3rem)] lg:grid-cols-[4fr_6fr]">
            <p className="font-display text-lead text-foreground-soft">
              {featuredStory.standfirst}
            </p>
            <div>
              <p className="max-w-[62ch] text-body text-foreground-soft">
                {featuredStory.body[0]}
              </p>
              <div className="mt-[clamp(1.5rem,3vw,2rem)]">
                <StoryDialog />
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
