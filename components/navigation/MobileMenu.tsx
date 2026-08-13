'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect } from 'react';
import { navigation } from '@/data/site';
import { featuredWalk } from '@/data/events';
import { useRSVP } from '@/components/rsvp/RSVPProvider';

export function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const reduced = useReducedMotion();
  const { open: openRSVP } = useRSVP();

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          id="mobile-menu"
          className="fixed inset-0 z-[70] flex flex-col bg-background p-gutter lg:hidden"
          initial={reduced ? false : { y: '-100%' }}
          animate={{ y: 0 }}
          exit={reduced ? { opacity: 0 } : { y: '-100%' }}
          transition={{ duration: reduced ? 0 : 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="mb-8 flex items-center justify-between">
            <span className="meta text-foreground">Menu</span>
            <button
              type="button"
              onClick={onClose}
              className="font-mono text-meta uppercase text-muted transition-colors hover:text-accent"
            >
              Close ✕
            </button>
          </div>

          <nav aria-label="Mobile">
            {navigation.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={onClose}
                className="display block border-b border-border py-[0.45em] text-[clamp(2rem,11vw,3.5rem)] leading-tight"
                {...('external' in item && item.external
                  ? { target: '_blank', rel: 'noreferrer noopener' }
                  : {})}
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="mt-auto pt-8">
            <button
              type="button"
              className="cta-solid w-full justify-between"
              onClick={() => {
                onClose();
                openRSVP(featuredWalk);
              }}
            >
              Join the next walk <span aria-hidden="true">→</span>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
