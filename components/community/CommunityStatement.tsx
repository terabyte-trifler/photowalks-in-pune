import { Reveal } from '@/components/ui/Reveal';

/**
 * The loudest moment on the page, and it is made of nothing but type. The
 * palette flips by redeclaring tokens on `.on-night`, so every colour utility
 * inside inverts without a single dark: variant.
 */
export function CommunityStatement() {
  const subjects = [
    'The streets.',
    'The people.',
    'The monsoon.',
    'The markets.',
    'The old buildings.',
    'The new city.',
    'The quiet corners.',
  ];

  return (
    <section
      id="statement"
      className="on-night bg-background py-section text-foreground"
      aria-labelledby="statement-title"
    >
      <div className="shell">
        <Reveal>
          <h2 id="statement-title" className="display text-display-xl">
            Pune is our subject.
          </h2>

          <ul className="my-[clamp(2rem,5vw,3.5rem)] font-display text-[clamp(1.4rem,3.6vw,2.75rem)] leading-[1.28] text-foreground-soft">
            {subjects.map((subject, index) => (
              <li
                key={subject}
                className={`border-b border-border py-[0.3em] ${index === 0 ? 'border-t' : ''}`}
              >
                {subject}
              </li>
            ))}
          </ul>

          <p className="display text-right text-display-xl">We just bring the cameras.</p>
        </Reveal>
      </div>
    </section>
  );
}
