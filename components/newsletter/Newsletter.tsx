'use client';

import { useState } from 'react';
import { isNewsletterConfigured, subscribe } from '@/lib/newsletter';
import { SectionHeader } from '@/components/ui/Typography';

type Status = 'idle' | 'sending' | 'done' | 'error';

export function Newsletter() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState('');
  const [persisted, setPersisted] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (status === 'sending') return;

    setStatus('sending');
    const result = await subscribe(email.trim());

    if (!result.ok) {
      setError(result.error ?? 'That did not go through.');
      setStatus('error');
      return;
    }

    setPersisted(result.persisted);
    setStatus('done');
  }

  return (
    <section id="newsletter" className="border-t border-border py-section" aria-labelledby="newsletter-title">
      <div className="shell">
        <SectionHeader index="10" label="The letter" />

        <h2 id="newsletter-title" className="display text-display-xl">
          Come walk with us.
        </h2>
        <p className="my-[clamp(1rem,2vw,1.5rem)] max-w-[46ch] font-display text-lead text-foreground-soft">
          Get the next walk, photo stories and things worth photographing around Pune.
        </p>

        {status === 'done' ? (
          <div role="status" className="mt-[clamp(2rem,4vw,3rem)]">
            <p className="display text-display-md">You&rsquo;re on the list.</p>
            <p className="meta mt-3">
              {persisted
                ? 'One email before each walk. Nothing else.'
                : 'Preview build — no newsletter provider is connected, so this address was kept in this browser only.'}
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            noValidate
            className="mt-[clamp(2rem,4vw,3rem)] flex max-w-[620px] flex-wrap items-end gap-x-8 gap-y-4"
          >
            <div className="flex-1 basis-[260px]">
              <label className="field-label" htmlFor="newsletter-email">
                Your email
              </label>
              <input
                id="newsletter-email"
                className="field-input"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (status === 'error') setStatus('idle');
                }}
                aria-invalid={status === 'error'}
                aria-describedby={status === 'error' ? 'newsletter-error' : undefined}
              />
              {status === 'error' && (
                <span
                  id="newsletter-error"
                  role="alert"
                  className="mt-1.5 block font-mono text-micro uppercase text-accent"
                >
                  {error}
                </span>
              )}
            </div>

            <button
              type="submit"
              className="cta disabled:opacity-60"
              disabled={status === 'sending'}
              aria-busy={status === 'sending'}
            >
              {status === 'sending' ? 'Sending' : 'Subscribe'} <span aria-hidden="true">→</span>
            </button>
          </form>
        )}

        {!isNewsletterConfigured() && status !== 'done' && (
          <p className="meta mt-5">
            Preview build — set NEXT_PUBLIC_NEWSLETTER_ENDPOINT to send these somewhere.
          </p>
        )}
      </div>
    </section>
  );
}
