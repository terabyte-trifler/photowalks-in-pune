'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { heroFrames } from '@/data/hero';

/* ============================================================================
 * THE HERO PHOTOGRAPH, AND THE FOUR BEHIND IT
 * ----------------------------------------------------------------------------
 * Five frames, crossfading every seven seconds. A hard cut behind a masthead
 * reads as the page reloading, and a brisk fade reads as a slideshow —
 * something that wants watching. This is meant to be barely noticed: you look
 * up and the photograph is a different one.
 *
 * WHY EVERY FRAME IS MOUNTED AT ONCE
 * The first version mounted each frame as its turn came, and it stuttered.
 * The network log said why:
 *
 *   +  985ms   pune-hero-02.jpg&w=16     the preload
 *   + 8956ms   pune-hero-02.jpg&w=1920   what actually rendered
 *
 * The preload was a 16px-wide thumbnail — a different optimiser variant from
 * the one on screen, so it warmed nothing at all. The real image was requested
 * at the exact moment its fade began, and downloaded *during* the crossfade: a
 * photograph fading in while it is still arriving.
 *
 * Preloading the right variant would have fixed that, but keeping all five
 * mounted is both simpler and strictly smoother. Every frame is decoded long
 * before its turn, and a change becomes a pure opacity transition between two
 * images already in memory. Nothing is fetched on a timer.
 *
 * It costs four more images on the homepage. They are 100–250 kB each at
 * source, far less as the AVIF actually served, fetched once and then edge
 * cached for a year — and only the first is `priority`, so none of them
 * competes with the LCP element for the opening moments.
 *
 * WHY OPACITY AND NOTHING ELSE
 * The earlier version also drifted each frame's scale while it held. A
 * continuous transform on a full-bleed image is the sort of thing that is free
 * on this laptop and visibly is not on a mid-range phone, which is most of
 * this audience. Opacity alone the compositor can do without laying out or
 * painting again.
 *
 * REDUCED MOTION
 * `prefers-reduced-motion` stops the rotation outright rather than merely
 * slowing it. Somebody who asked their system for less movement did not ask
 * for the same movement at a different speed, and a photograph replacing
 * itself under a headline is exactly what that setting is for. They get the
 * first frame, held.
 *
 * THE PACE IS THESE TWO NUMBERS
 * Everything derives from them. Changing the speed is one line rather than
 * four durations that have to agree — which is the shape of mistake that put
 * the same figure in two places once already, and leaked the DOM.
 * ========================================================================== */

/** How long a frame sits before the next begins to arrive. */
const HOLD_MS = 7000;
/** How long two frames overlap. Long, so the change is a drift and not a cut. */
const FADE_MS = 2400;

export function HeroImage() {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (reduced || heroFrames.length < 2) return;
    const timer = setInterval(
      () => setIndex((current) => (current + 1) % heroFrames.length),
      HOLD_MS,
    );
    return () => clearInterval(timer);
  }, [reduced]);

  return (
    <div className="absolute inset-0">
      {heroFrames.map((frame, i) => (
        <motion.div
          key={frame.src}
          className="absolute inset-0"
          initial={false}
          animate={{ opacity: i === index ? 1 : 0 }}
          transition={{ duration: reduced ? 0 : FADE_MS / 1000, ease: 'linear' }}
          /* The stack has a fixed order, so the frame coming in is told to sit
             above the one going out rather than relying on source order. */
          style={{ zIndex: i === index ? 1 : 0 }}
        >
          <Image
            src={frame.src}
            alt={frame.alt}
            fill
            /* Only the frame on screen at arrival is the LCP element. The rest
               load in their own time, long before their turn comes. */
            priority={i === 0}
            quality={72}
            sizes="100vw"
            className="object-cover"
          />
        </motion.div>
      ))}

      {/* The credit travels with the frame. aria-live is deliberately off: this
          changes on a timer, and announcing a photographer's name on a loop
          would be hostile to anybody listening to the page. */}
      <div className="pointer-events-none absolute bottom-0 right-0 z-10 grid p-[clamp(1rem,3vw,2rem)]">
        {heroFrames.map((frame, i) => (
          <motion.span
            key={frame.src}
            initial={false}
            animate={{ opacity: i === index ? 1 : 0 }}
            transition={{ duration: reduced ? 0 : FADE_MS / 2000 }}
            /* Stacked in one grid cell so they occupy the same spot without
               absolute positioning, and the box is sized by the longest name. */
            className="col-start-1 row-start-1 text-right font-mono text-micro uppercase tracking-[0.18em] text-[rgba(245,241,234,0.6)]"
          >
            {frame.credit}
          </motion.span>
        ))}
      </div>
    </div>
  );
}
