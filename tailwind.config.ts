import type { Config } from 'tailwindcss';

/**
 * Every token resolves to a CSS variable declared in app/globals.css, so the
 * dark statement section can flip the whole palette by redeclaring five
 * variables and every Tailwind colour utility follows it.
 */
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        'foreground-soft': 'var(--foreground-soft)',
        muted: 'var(--muted)',
        accent: 'var(--accent)',
        border: 'var(--border)',
        'border-strong': 'var(--border-strong)',
        subtle: 'var(--subtle)',
        night: '#14110E',
      },
      fontFamily: {
        display: ['var(--font-display)', 'Times New Roman', 'serif'],
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      /* One editorial scale. Fluid, so there are no orphan breakpoints.
       *
       * TRACKING: POSITIVE ON THE DISPLAY SIZES, AND THAT IS THE POINT
       * Every display size used to carry negative tracking (-0.015em), which
       * is the right instinct for large *mixed-case* type — tightening closes
       * the gaps that open up around round letters when you set something at
       * 168px.
       *
       * But `.display` is `uppercase`. Caps are near-uniform rectangles with
       * no ascenders or descenders to interlock, so they do not have those
       * gaps to close: they sit flush and read as one solid block. Tightening
       * them further is what made a word like LIKE look jammed together.
       * Caps want opening up, not closing in.
       *
       * The amount goes UP as the size goes DOWN, which looks backwards and
       * is not. Tracking is optical: at 168px the letterforms already have
       * plenty of room between them and need only a nudge, while the same
       * word set at 26px needs noticeably more air to separate. So the hero
       * gets +0.015em and display-sm gets +0.03em.
       *
       * LINE HEIGHT MOVED TOO
       * The other half of "congested" was vertical. A two-line cap heading at
       * 0.82 leading has almost nothing between the rows, because caps fill
       * the full band with no descenders to create visual space. Loosened
       * across the scale — still tight enough to read as editorial display,
       * no longer touching.
       */
      fontSize: {
        hero: ['clamp(3.1rem, 12.2vw, 10.5rem)', { lineHeight: '0.92', letterSpacing: '0.015em' }],
        'display-xl': ['clamp(2.75rem, 8vw, 6.5rem)', { lineHeight: '0.95', letterSpacing: '0.018em' }],
        'display-lg': ['clamp(2.1rem, 5vw, 4rem)', { lineHeight: '0.98', letterSpacing: '0.022em' }],
        'display-md': ['clamp(1.6rem, 3vw, 2.4rem)', { lineHeight: '1.08', letterSpacing: '0.026em' }],
        'display-sm': ['clamp(1.35rem, 2.4vw, 1.9rem)', { lineHeight: '1.16', letterSpacing: '0.03em' }],
        /* Lead is mixed-case, so it only comes back to neutral rather than
           going positive — opening running text hurts it. */
        lead: ['clamp(1.15rem, 1.9vw, 1.6rem)', { lineHeight: '1.5', letterSpacing: '0' }],
        /* A hair of air on body copy. Beyond about 0.01em, Archivo at 16px
           starts to read as spaced-out rather than comfortable. */
        body: ['1rem', { lineHeight: '1.78', letterSpacing: '0.01em' }],
        meta: ['0.6875rem', { lineHeight: '1.75', letterSpacing: '0.2em' }],
        micro: ['0.625rem', { lineHeight: '1.65', letterSpacing: '0.2em' }],
      },
      spacing: {
        gutter: 'clamp(1.25rem, 4.5vw, 4.5rem)',
        section: 'clamp(4.5rem, 10vw, 9rem)',
        'section-sm': 'clamp(3rem, 6vw, 5.5rem)',
      },
      maxWidth: { shell: '1440px' },
      borderRadius: { DEFAULT: '0', none: '0' },
      transitionTimingFunction: { editorial: 'cubic-bezier(0.16, 1, 0.3, 1)' },
    },
  },
  plugins: [],
};

export default config;
