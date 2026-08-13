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
      /* One editorial scale. Fluid, so there are no orphan breakpoints. */
      fontSize: {
        hero: ['clamp(3.1rem, 12.2vw, 10.5rem)', { lineHeight: '0.82', letterSpacing: '-0.015em' }],
        'display-xl': ['clamp(2.75rem, 8vw, 6.5rem)', { lineHeight: '0.86', letterSpacing: '-0.015em' }],
        'display-lg': ['clamp(2.1rem, 5vw, 4rem)', { lineHeight: '0.88', letterSpacing: '-0.015em' }],
        'display-md': ['clamp(1.6rem, 3vw, 2.4rem)', { lineHeight: '0.95', letterSpacing: '-0.01em' }],
        'display-sm': ['clamp(1.35rem, 2.4vw, 1.9rem)', { lineHeight: '1.02', letterSpacing: '-0.01em' }],
        lead: ['clamp(1.15rem, 1.9vw, 1.6rem)', { lineHeight: '1.42', letterSpacing: '-0.005em' }],
        body: ['1rem', { lineHeight: '1.72' }],
        meta: ['0.6875rem', { lineHeight: '1.7', letterSpacing: '0.18em' }],
        micro: ['0.625rem', { lineHeight: '1.6', letterSpacing: '0.18em' }],
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
