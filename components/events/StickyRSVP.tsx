'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { nextOpenWalk } from '@/data/events';
import { longDate } from '@/lib/utils';
import { RSVPButton } from '@/components/rsvp/RSVPButton';

/**
 * Mobile only. The next walk follows you down the page once the hero has gone,
 * because on a phone the primary action scrolls out of reach immediately.
 */
export function StickyRSVP() {
  const [visible, setVisible] = useState(false);
  const reduced = useReducedMotion();

  /* The walk this leads to is chosen, not fixed, so the bar follows the same
     walk section 02 does. Safe to read the clock directly: `visible` starts
     false and is set from an effect, so this never renders during hydration
     and cannot disagree with the server about the time. */
  const walk = nextOpenWalk();

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 700);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && walk && (
        <motion.div
          className="fixed inset-x-0 bottom-0 z-[55] flex items-center justify-between gap-4 border-t border-border bg-background/95 px-gutter pb-[calc(0.85rem+env(safe-area-inset-bottom))] pt-3.5 backdrop-blur-md lg:hidden"
          initial={reduced ? false : { y: '110%' }}
          animate={{ y: 0 }}
          exit={reduced ? { opacity: 0 } : { y: '110%' }}
          transition={{ duration: reduced ? 0 : 0.4, ease: [0.16, 1, 0.3, 1] }}
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
        </motion.div>
      )}
    </AnimatePresence>
  );
}
