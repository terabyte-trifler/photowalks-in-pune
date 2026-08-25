'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { navigation } from '@/data/site';
import { nextOpenWalk } from '@/data/events';
import { useRSVP } from '@/components/rsvp/RSVPProvider';
import { useAuth } from '@/components/auth/AuthProvider';
import { Avatar } from './Avatar';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

export function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const reduced = useReducedMotion();
  const { open: openRSVP } = useRSVP();
  /* Only ever rendered once somebody has opened the menu, so reading the
     clock here cannot disagree with a prerendered page. */
  const nextWalk = nextOpenWalk();
  const { user, profile, loading, signOut } = useAuth();

  /* Same reason as SiteHeader: the sections only exist on the homepage. */
  const pathname = usePathname();
  /* Only fragments need the prefix — see the note in SiteHeader. */
  const sectionHref = (href: string) =>
    href.startsWith('#') && pathname !== '/' ? `/${href}` : href;

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          id="mobile-menu"
          className="fixed inset-0 z-[70] flex flex-col bg-background p-gutter lg:hidden"
          initial={reduced ? false : { y: '-100%' }}
          animate={{ y: 0 }}
          exit={reduced ? { opacity: 0 } : { y: '-100%' }}
          transition={{ duration: reduced ? 0 : 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="mb-8 flex items-center justify-between">
            <span className="meta text-foreground">Menu</span>
            <button
              type="button"
              onClick={onClose}
              className="font-mono text-meta uppercase text-muted transition-colors hover:text-accent"
            >
              Close ✕
            </button>
          </div>

          <nav aria-label="Mobile">
            {navigation.map((item) => (
              <a
                key={item.label}
                href={'external' in item && item.external ? item.href : sectionHref(item.href)}
                onClick={onClose}
                className="display block border-b border-border py-[0.45em] text-[clamp(2rem,11vw,3.5rem)] leading-tight"
                {...('external' in item && item.external
                  ? { target: '_blank', rel: 'noreferrer noopener' }
                  : {})}
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* The account, in the quieter mono register so the walk nav above
              keeps the page's voice. */}
          {!loading && (
            <div className="mt-8">
              {user ? (
                <>
                  <div className="flex items-center gap-3 border-b border-border pb-4">
                    <Avatar src={profile?.avatar_url} name={profile?.full_name ?? 'Photographer'} size={34} />
                    <span className="min-w-0">
                      <span className="block truncate text-[0.9375rem] font-medium tracking-normal">
                        {profile?.full_name ?? 'Photographer'}
                      </span>
                      <span className="meta block truncate normal-case tracking-[0.1em]">
                        {profile ? `@${profile.username}` : user.email}
                      </span>
                    </span>
                  </div>

                  <ul className="grid">
                    {[
                      { label: 'Profile', href: profile ? `/photographers/${profile.username}` : '/profile' },
                      { label: 'My walks', href: '/my-walks' },
                      { label: 'Settings', href: '/settings' },
                    ].map((item) => (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={onClose}
                          className="block border-b border-border py-3.5 font-mono text-meta uppercase text-foreground-soft transition-colors hover:text-accent"
                        >
                          {item.label}
                        </Link>
                      </li>
                    ))}
                    <li>
                      <button
                        type="button"
                        onClick={async () => {
                          onClose();
                          await signOut();
                        }}
                        className="block w-full py-3.5 text-left font-mono text-meta uppercase text-foreground-soft transition-colors hover:text-accent"
                      >
                        Log out
                      </button>
                    </li>
                  </ul>
                </>
              ) : (
                <div className="flex flex-wrap items-center gap-x-8 gap-y-3 border-t border-border pt-5">
                  <Link href="/login" onClick={onClose} className="cta">
                    Log in <span aria-hidden="true">→</span>
                  </Link>
                  <Link href="/signup" onClick={onClose} className="cta">
                    Join <span aria-hidden="true">→</span>
                  </Link>
                </div>
              )}
            </div>
          )}

          {/* A labelled row of its own down here, rather than squeezed into the
              header: on a phone there is room to say what it does. */}
          <div className="mt-8 flex items-center justify-between border-t border-border pt-5">
            <span className="meta">Appearance</span>
            <ThemeToggle />
          </div>

          {nextWalk && (
            <div className="mt-auto pt-8">
              <button
                type="button"
                className="cta-solid w-full justify-between"
                onClick={() => {
                  onClose();
                  openRSVP(nextWalk);
                }}
              >
                Join the next walk <span aria-hidden="true">→</span>
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
