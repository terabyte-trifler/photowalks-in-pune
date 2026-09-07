'use client';

import { useEffect, useState } from 'react';
import { nextOpenWalk } from '@/data/events';
import { longDate } from '@/lib/utils';
import { RSVPButton } from '@/components/rsvp/RSVPButton';

/**
 * Mobile only. The next walk follows you down the page once the hero has gone,
 * because on a phone the primary action scrolls out of reach immediately.
 *
 * The slide used to be framer-motion's AnimatePresence, which had to keep the
 * component mounted to animate it leaving. A CSS transition does the same thing
 * with no library: the bar stays in the tree and is translated out of view, and
 * `inert` takes it out of the tab order and the accessibility tree while it is
 * down there — the part a bare transform would have got wrong, leaving an
 * off-screen button that could still be tabbed to.
 */
export function StickyRSVP() {
  const [visible, setVisible] = useState(false);

  /* The walk this leads to is chosen, not fixed, so the bar follows the same
     walk section 02 does. Null when every walk has been, which is why nothing
     below assumes there is one. */
  const walk = nextOpenWalk();

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 700);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  /* No walk to point at means no bar at all — not a hidden one. There is
     nothing to animate in later, so mounting it would be dead markup on every
     mobile page load. */
  if (!walk) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[55] flex items-center justify-between gap-4 border-t border-border bg-background/95 px-gutter pb-[calc(0.85rem+env(safe-area-inset-bottom))] pt-3.5 backdrop-blur-md transition-transform duration-[400ms] ease-editorial motion-reduce:transition-none lg:hidden"
      style={{ transform: visible ? 'translateY(0)' : 'translateY(110%)' }}
      inert={!visible}
    >
      <div className="min-w-0">
        <p className="meta truncate text-foreground">{walk.title}</p>
        <p className="meta truncate">
          {longDate(walk.date)} · {walk.time}
        </p>
      </div>
      <RSVPButton event={walk} className="cta-solid flex-none px-5 py-3.5">
        I&rsquo;m in <span aria-hidden="true">→</span>
      </RSVPButton>
    </div>
  );
}
