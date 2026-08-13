'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { featuredWalk } from '@/data/events';
import { longDate } from '@/lib/utils';
import { RSVPButton } from '@/components/rsvp/RSVPButton';

/**
 * Mobile only. The next walk follows you down the page once the hero has gone,
 * because on a phone the primary action scrolls out of reach immediately.
 */
export function StickyRSVP() {
  const [visible, setVisible] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 700);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-x-0 bottom-0 z-[55] flex items-center justify-between gap-4 border-t border-border bg-background/95 px-gutter pb-[calc(0.85rem+env(safe-area-inset-bottom))] pt-3.5 backdrop-blur-md lg:hidden"
          initial={reduced ? false : { y: '110%' }}
          animate={{ y: 0 }}
          exit={reduced ? { opacity: 0 } : { y: '110%' }}
          transition={{ duration: reduced ? 0 : 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="min-w-0">
            <p className="meta truncate text-foreground">{featuredWalk.title}</p>
            <p className="meta truncate">
              {longDate(featuredWalk.date)} · {featuredWalk.time}
            </p>
          </div>
          <RSVPButton event={featuredWalk} className="cta-solid flex-none px-5 py-3.5">
            I&rsquo;m in <span aria-hidden="true">→</span>
          </RSVPButton>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
