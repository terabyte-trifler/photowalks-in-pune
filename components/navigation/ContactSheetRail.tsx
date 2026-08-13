'use client';

import { useEffect, useState } from 'react';
import { sections } from '@/data/site';
import { cn, padIndex } from '@/lib/utils';

/**
 * The signature element: a strip of film down the left edge of the page.
 * The numbers are the section sequence and the lit one is where you are —
 * information, not ornament. Hidden below 1180px, where there is no margin
 * to spare.
 */
export function ContactSheetRail({ coordinates, city }: { coordinates: string; city: string }) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const best = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!best) return;
        const index = sections.findIndex((section) => section.id === best.target.id);
        if (index >= 0) setActiveIndex(index);
      },
      { rootMargin: '-40% 0px -50% 0px', threshold: [0, 0.2, 0.6] },
    );

    sections.forEach(({ id }) => {
      const node = document.getElementById(id);
      if (node) observer.observe(node);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-y-0 left-0 z-50 hidden w-[84px] border-r border-border xl:block"
    >
      <div
        className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 rotate-180 items-center gap-7 font-mono text-micro uppercase tracking-[0.24em] text-muted"
        style={{ writingMode: 'vertical-rl' }}
      >
        <span>
          {city} · {coordinates}
        </span>
        <span>
          {sections.map((section, index) => (
            <span
              key={section.id}
              className={cn(
                'transition-colors duration-500',
                index === activeIndex ? 'text-accent' : 'text-border-strong',
              )}
            >
              {padIndex(index + 1)}
              {index < sections.length - 1 ? ' · ' : ''}
            </span>
          ))}
        </span>
        <span>{sections[activeIndex].label}</span>
      </div>
    </div>
  );
}
