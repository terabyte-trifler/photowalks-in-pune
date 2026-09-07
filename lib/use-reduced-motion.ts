'use client';

import { useEffect, useState } from 'react';

/* ============================================================================
 * PREFERS-REDUCED-MOTION, WITHOUT AN ANIMATION LIBRARY
 * ----------------------------------------------------------------------------
 * framer-motion's useReducedMotion was, on several components, the only reason
 * the library was imported at all — 54 kB to answer a media query the platform
 * answers for free.
 *
 * Most of the time this hook is not needed either: a CSS transition should be
 * turned off with `motion-reduce:transition-none`, which costs no JavaScript
 * and needs no re-render to notice a change. Reach for this only where the
 * motion is driven from JS and there is something to switch off — a timer that
 * advances a slideshow, say, which no stylesheet can stop.
 *
 * Starts false and corrects on mount. That order matters: false renders the
 * animated markup, and if the preference is set the effect turns it off within
 * a frame. Starting true would mean everybody's first paint assumed reduced
 * motion and then jumped.
 * ========================================================================== */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(query.matches);

    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  return reduced;
}
