'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { heroFrames } from '@/data/hero';

/* ============================================================================
 * THE HERO PHOTOGRAPH, AND THE FOUR BEHIND IT
 * ----------------------------------------------------------------------------
 * Five frames, crossfading slowly. A hard cut behind a masthead reads as the
 * page reloading, and even a brisk fade reads as a slideshow — something that
 * wants watching. This is meant to be barely noticed: you look up and the
 * photograph is a different one.
 *
 * The two numbers below are the whole of it. Everything else derives from
 * them, so changing the pace means changing one line and not hunting for a
 * duration that was written down twice.
 * Both frames are on screen through the whole fade, which is what stops the
 * background flashing between them.
 *
 * It settles from a 1.04 scale on the way in, the way the single image always
 * did, and drifts very slightly while it holds. That drift is the reason the
 * rotation does not feel like a slideshow: something is always moving, so the
 * change is a continuation rather than an event.
 *
 * WHAT IT DOES NOT DO
 * No parallax and nothing scroll-linked — the brief asks for restraint, and
 * scroll-driven transforms are the first thing to cost frames on a page this
 * photography-heavy.
 *
 * REDUCED MOTION
 * `prefers-reduced-motion` stops the rotation outright rather than merely
 * shortening it. Somebody who has asked their system for less movement has not
 * asked for the same movement at a different speed, and a photograph replacing
 * itself under a headline is exactly the kind of thing that setting is for.
 * They get the first frame, held.
 *
 * COST
 * Only the first frame is `priority` — it is the LCP element. The rest load
 * lazily, and the second is nudged in shortly after mount so the first change
 * is not the one that has to wait for a download.
 * ========================================================================== */

/** How long a frame sits before the next begins to arrive. */
const HOLD_MS = 8000;
/** How long the two frames overlap. Long, so the change is a drift not a cut. */
const FADE_MS = 2400;

export function HeroImage() {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  /* Nothing beyond the first frame is rendered until after mount: the server
     has no opinion about which frame is showing, and rendering all five into
     the HTML would push four images the visitor may never see. */
  const [rotating, setRotating] = useState(false);

  useEffect(() => {
    if (reduced || heroFrames.length < 2) return;
    setRotating(true);
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % heroFrames.length);
    }, HOLD_MS);
    return () => clearInterval(timer);
  }, [reduced]);

  const frame = heroFrames[index];

  return (
    <div className="absolute inset-0">
      <AnimatePresence initial={false}>
        <motion.div
          key={frame.src}
          className="absolute inset-0"
          initial={reduced ? false : { opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          /* Held frames drift a little rather than sitting perfectly still. */
          /* Enter and exit need different clocks, and sharing one leaks. The
             slow scale is the drift while a frame holds, so it runs longer than
             the hold itself — but AnimatePresence keeps an exiting element
             mounted until its exit transition finishes. Sharing that figure
             with the exit meant every frame outlived two changes and the DOM
             grew by an image on every tick. The exit carries its own, shorter
             transition; the fade is all it needs. */
          exit={{
            opacity: 0,
            transition: { duration: reduced ? 0 : FADE_MS / 1000, ease: 'linear' },
          }}
          transition={{
            opacity: { duration: reduced ? 0 : FADE_MS / 1000, ease: 'linear' },
            /* The drift runs the whole time a frame is on screen — its hold
               plus both fades — so it never visibly stops and restart. */
            scale: {
              duration: reduced ? 0 : (HOLD_MS + FADE_MS) / 1000,
              ease: [0.16, 1, 0.3, 1],
            },
          }}
        >
          <Image
            src={frame.src}
            alt={frame.alt}
            fill
            /* Only the frame that is there on arrival is the LCP element. */
            priority={index === 0}
            loading={index === 0 ? undefined : 'lazy'}
            quality={72}
            sizes="100vw"
            className="object-cover"
          />
        </motion.div>
      </AnimatePresence>

      {/* Warms the next frame while the current one is still holding, so the
          first change does not stall on a download. */}
      {rotating && (
        <div aria-hidden="true" className="pointer-events-none absolute h-0 w-0 overflow-hidden">
          <Image
            src={heroFrames[(index + 1) % heroFrames.length].src}
            alt=""
            width={16}
            height={16}
            quality={72}
          />
        </div>
      )}

      {/* The credit travels with the frame. aria-live is deliberately off:
          this changes on a timer, and announcing a photographer's name on a
          loop would be hostile to anybody listening to the page. */}
      <div className="pointer-events-none absolute bottom-0 right-0 z-10 p-[clamp(1rem,3vw,2rem)]">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={frame.credit}
            initial={reduced ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduced ? 0 : FADE_MS / 2000 }}
            className="font-mono text-micro uppercase tracking-[0.18em] text-[rgba(245,241,234,0.6)]"
          >
            {frame.credit}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
