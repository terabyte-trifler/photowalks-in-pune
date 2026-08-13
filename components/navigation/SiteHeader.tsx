'use client';

import { useEffect, useState } from 'react';
import { featuredWalk } from '@/data/events';
import { navigation, site } from '@/data/site';
import { cn } from '@/lib/utils';
import { RSVPButton } from '@/components/rsvp/RSVPButton';
import { MobileMenu } from './MobileMenu';

/**
 * Client because it reacts to scroll and owns the mobile menu. Small enough
 * that the rest of the page stays on the server.
 */
export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <header
        className={cn(
          'sticky top-0 z-[60] border-b transition-[background-color,border-color,backdrop-filter] duration-500',
          scrolled
            ? 'border-border bg-background/85 backdrop-blur-md backdrop-saturate-150'
            : 'border-transparent',
        )}
      >
        <nav className="shell flex min-h-[62px] items-center justify-between gap-6" aria-label="Primary">
          <a href="#hero" className="inline-flex items-center gap-2.5 text-[0.9375rem] font-medium tracking-tight">
            <span
              aria-hidden="true"
              className="grid h-[22px] w-[22px] flex-none place-items-center rounded-full border border-foreground"
            >
              <span className="h-[7px] w-[7px] rounded-full bg-accent" />
            </span>
            {site.name}
          </a>

          <div className="hidden items-center gap-9 lg:flex">
            {navigation.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="border-b border-transparent py-1.5 font-mono text-meta uppercase text-foreground-soft transition-colors hover:border-accent hover:text-foreground"
                {...('external' in item && item.external
                  ? { target: '_blank', rel: 'noreferrer noopener' }
                  : {})}
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <RSVPButton
              event={featuredWalk}
              className="border border-foreground px-4 py-2.5 font-mono text-meta uppercase transition-colors hover:bg-foreground hover:text-background"
            >
              Join a walk
            </RSVPButton>

            <button
              type="button"
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              onClick={() => setMenuOpen(true)}
              className="flex flex-col gap-1 px-1 py-2.5 lg:hidden"
            >
              <span className="h-px w-5 bg-foreground" />
              <span className="h-px w-5 bg-foreground" />
              <span className="h-px w-5 bg-foreground" />
              <span className="sr-only">Open menu</span>
            </button>
          </div>
        </nav>
      </header>

      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </>
  );
}
