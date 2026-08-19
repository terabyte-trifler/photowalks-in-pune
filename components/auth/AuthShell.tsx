import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { site } from '@/data/site';

/* ============================================================================
 * THE ACCOUNT SCREENS
 * ----------------------------------------------------------------------------
 * A photograph on one side, a form on the other. Same paper, same hairlines,
 * same type: the display serif set large and all-caps, mono for every piece of
 * metadata, underline fields, zero border radius. Nothing here is new — it is
 * the hero's scrim and the contact sheet's rebate strip, rearranged.
 *
 * The photograph is not decoration on this site, so it carries a caption and a
 * frame number exactly like the ones in the archive do.
 * ========================================================================== */

export function AuthShell({
  frame,
  eyebrow,
  title,
  standfirst,
  image,
  imageAlt,
  caption,
  children,
  footer,
}: {
  /** Frame number in the sequence of account screens: 01 join, 02 log in… */
  frame: string;
  eyebrow: string;
  title: ReactNode;
  standfirst: string;
  image: string;
  imageAlt: string;
  caption: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-screen lg:grid lg:min-h-screen lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* ---- The photograph ------------------------------------------- */}
      <aside className="relative h-[clamp(200px,30vh,280px)] overflow-hidden bg-night lg:sticky lg:top-0 lg:h-screen">
        {/* `fill` needs a parent with position absolute/fixed/relative, and the
            aside becomes `sticky` at lg — hence this wrapper. */}
        <div className="absolute inset-0">
          <Image
            src={image}
            alt={imageAlt}
            fill
            priority
            quality={70}
            sizes="(min-width: 1024px) 45vw, 100vw"
            className="object-cover"
          />
        </div>
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(to_top,rgba(10,9,8,0.86)_0%,rgba(10,9,8,0.22)_48%,rgba(10,9,8,0.42)_100%)]"
        />

        <div className="relative flex h-full flex-col justify-between p-[clamp(1.25rem,3vw,2.5rem)] text-[#F5F1EA]">
          <div className="flex justify-between gap-4 font-mono text-micro uppercase tracking-[0.2em] text-[rgba(245,241,234,0.72)]">
            <span>
              {site.city} · India
            </span>
            <span>{site.coordinates}</span>
          </div>

          <div>
            <p className="display hidden text-[clamp(1.75rem,3.2vw,3rem)] leading-[0.95] text-[#F7F3EC] lg:block">
              Walk. Photograph.
              <br />
              Connect.
            </p>
            <p className="mt-4 font-mono text-micro uppercase tracking-[0.2em] text-[rgba(245,241,234,0.8)]">
              {frame} · {caption}
            </p>
          </div>
        </div>
      </aside>

      {/* ---- The form -------------------------------------------------- */}
      <div className="flex min-h-[70vh] flex-col lg:min-h-screen">
        <header className="flex items-center justify-between gap-4 border-b border-border px-gutter py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 text-[0.9375rem] font-medium tracking-tight"
          >
            <span
              aria-hidden="true"
              className="grid h-[22px] w-[22px] flex-none place-items-center rounded-full border border-foreground"
            >
              <span className="h-[7px] w-[7px] rounded-full bg-accent" />
            </span>
            {site.name}
          </Link>

          <Link
            href="/"
            className="font-mono text-micro uppercase text-muted transition-colors hover:text-accent"
          >
            ← Back to the site
          </Link>
        </header>

        <main className="flex flex-1 items-center px-gutter py-[clamp(2.5rem,6vw,4.5rem)]">
          <div className="w-full max-w-[27rem] lg:mx-auto">
            <p className="meta">{eyebrow}</p>
            <h1 className="display mt-4 text-display-lg">{title}</h1>
            <p className="mt-4 max-w-[38ch] font-display text-lead text-foreground-soft">
              {standfirst}
            </p>

            <div className="mt-[clamp(2rem,4vw,2.75rem)]">{children}</div>
          </div>
        </main>

        {footer && (
          <footer className="border-t border-border px-gutter py-5">
            <div className="w-full max-w-[27rem] lg:mx-auto">{footer}</div>
          </footer>
        )}
      </div>
    </div>
  );
}

/** The "or" between the password form and Google. A rule with a word in it. */
export function AuthDivider({ label = 'or' }: { label?: string }) {
  return (
    <div className="my-7 flex items-center gap-4" aria-hidden="true">
      <span className="h-px flex-1 bg-border" />
      <span className="font-mono text-micro uppercase text-muted">{label}</span>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
