'use client';

import { useEffect, useState } from 'react';

/* ============================================================================
 * LIGHT / DARK
 * ----------------------------------------------------------------------------
 * Three states rather than two, because "follow my computer" is the honest
 * default and the one most people already expect. The switch cycles
 *
 *   Auto  ->  Light  ->  Dark  ->  Auto
 *
 * and says which one it is on, so nobody has to guess whether the site is
 * light because they chose it or because their laptop is.
 *
 * WHERE THE STATE ACTUALLY LIVES
 * On <html> as data-theme, written by the inline script in app/layout.tsx
 * before the first paint. This component only reads it back on mount and
 * writes it on click. It deliberately does not decide the theme on render:
 * the server has no idea what is in localStorage, so anything derived from it
 * during render is a hydration mismatch waiting to happen.
 *
 * That is also why the labels start empty and fill in after mount — the markup
 * the server sends has to match what React first renders in the browser, and
 * the only honest value before mount is "not known yet".
 * ========================================================================== */

type Choice = 'auto' | 'light' | 'dark';

const NEXT: Record<Choice, Choice> = { auto: 'light', light: 'dark', dark: 'auto' };
const LABEL: Record<Choice, string> = { auto: 'Auto', light: 'Light', dark: 'Dark' };

/** Kept identical to the inline script in layout.tsx. */
const STORAGE_KEY = 'pwip.theme';

function apply(choice: Choice) {
  const root = document.documentElement;
  if (choice === 'auto') {
    root.removeAttribute('data-theme');
    localStorage.removeItem(STORAGE_KEY);
  } else {
    root.setAttribute('data-theme', choice);
    localStorage.setItem(STORAGE_KEY, choice);
  }
}

export function ThemeToggle({ className = '' }: { className?: string }) {
  /* null until mounted: see the note above about hydration. */
  const [choice, setChoice] = useState<Choice | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    setChoice(stored === 'light' || stored === 'dark' ? stored : 'auto');
  }, []);

  function cycle() {
    const next = NEXT[choice ?? 'auto'];
    apply(next);
    setChoice(next);
  }

  const current = choice ?? 'auto';

  return (
    <button
      type="button"
      onClick={cycle}
      /* The label carries the state for a screen reader; the glyph is
         decorative and hidden from one. */
      aria-label={`Theme: ${LABEL[current]}. Switch to ${LABEL[NEXT[current]]}.`}
      title={`Theme: ${LABEL[current]}`}
      className={`group inline-flex items-center gap-2 border border-border px-2.5 py-1.5 font-mono text-micro uppercase tracking-[0.18em] text-muted transition-colors hover:border-border-strong hover:text-foreground ${className}`}
    >
      <span aria-hidden="true" className="grid h-3 w-3 place-items-center">
        {/* A contact-sheet lens rather than a sun and a moon: filled for dark,
            hollow for light, half for auto. Drawn in CSS so it needs no icon
            font and no network request. */}
        <span
          className={
            current === 'dark'
              ? 'block h-2.5 w-2.5 rounded-full bg-accent'
              : current === 'light'
                ? 'block h-2.5 w-2.5 rounded-full border border-current'
                : 'block h-2.5 w-2.5 rounded-full border border-current [background:linear-gradient(90deg,currentColor_50%,transparent_50%)]'
          }
        />
      </span>
      {/* Empty before mount so the server markup and the first client render
          agree; it fills in a frame later. */}
      <span className="min-w-[2.5rem] text-left">{choice ? LABEL[choice] : ''}</span>
    </button>
  );
}
