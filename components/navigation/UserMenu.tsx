'use client';

import Link from 'next/link';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';
import { Avatar } from './Avatar';

/* ============================================================================
 * THE ACCOUNT CONTROL
 * ----------------------------------------------------------------------------
 * Three states, in the header's own vocabulary — mono caps, hairlines, no
 * rounded corners except the avatar circle, which is the brand mark's circle.
 *
 *   loading    a placeholder the same size as what replaces it, so the header
 *              does not jump when the session resolves
 *   logged out Log in · Join
 *   logged in  avatar + first name, opening Profile / My Walks / Settings /
 *              Log out
 *
 * "Join a walk" stays exactly where it was, separated by a hairline: booking a
 * walk is the product, this is only the account.
 * ========================================================================== */

const MENU_ITEMS = [
  { label: 'Profile', href: '/profile' },
  { label: 'My walks', href: '/my-walks' },
  { label: 'Settings', href: '/settings' },
] as const;

export function UserMenu() {
  const { user, profile, loading, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!open) return;

    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onPointer = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };

    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
    };
  }, [open]);

  /* ---- Loading ---------------------------------------------------------- */
  if (loading) {
    return (
      <span
        aria-hidden="true"
        className="h-[30px] w-[30px] flex-none animate-pulse rounded-full border border-border-strong bg-subtle"
      />
    );
  }

  /* ---- Signed out ------------------------------------------------------- */
  if (!user) {
    return (
      <span className="hidden items-center gap-5 lg:flex">
        <Link
          href="/login"
          className="border-b border-transparent py-1.5 font-mono text-meta uppercase text-foreground-soft transition-colors hover:border-accent hover:text-foreground"
        >
          Log in
        </Link>
        <Link
          href="/signup"
          className="border-b border-transparent py-1.5 font-mono text-meta uppercase text-foreground-soft transition-colors hover:border-accent hover:text-foreground"
        >
          Join
        </Link>
        <span aria-hidden="true" className="h-4 w-px bg-border" />
      </span>
    );
  }

  /* ---- Signed in -------------------------------------------------------- */
  const name = profile?.full_name ?? 'Photographer';
  const firstName = name.trim().split(/\s+/)[0];
  const profileHref = profile ? `/photographers/${profile.username}` : '/profile';

  return (
    <div ref={containerRef} className="relative flex items-center gap-3">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls="user-menu"
        className="flex items-center gap-2.5 border-b border-transparent py-1.5 transition-colors hover:border-accent"
      >
        <Avatar src={profile?.avatar_url} name={name} size={30} />
        <span className="hidden font-mono text-meta uppercase text-foreground-soft sm:inline">
          {firstName}
        </span>
        <span className="sr-only">Your account</span>
      </button>

      <span aria-hidden="true" className="hidden h-4 w-px bg-border lg:block" />

      <AnimatePresence>
        {open && (
          <motion.div
            id="user-menu"
            role="menu"
            aria-label="Your account"
            className="absolute right-0 top-[calc(100%+0.75rem)] z-[80] w-[230px] border border-border-strong bg-background"
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={{ duration: reduced ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="border-b border-border px-4 py-3.5">
              <p className="truncate text-[0.875rem] font-medium tracking-tight">{name}</p>
              <p className="meta mt-1 truncate normal-case tracking-[0.08em]">
                {profile ? `@${profile.username}` : user.email}
              </p>
            </div>

            <ul>
              {MENU_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link
                    role="menuitem"
                    href={item.href === '/profile' ? profileHref : item.href}
                    onClick={() => setOpen(false)}
                    className="block border-b border-border px-4 py-3 font-mono text-meta uppercase text-foreground-soft transition-colors hover:bg-subtle hover:text-foreground"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>

            <button
              role="menuitem"
              type="button"
              disabled={signingOut}
              aria-busy={signingOut}
              onClick={async () => {
                setSigningOut(true);
                setOpen(false);
                await signOut();
                setSigningOut(false);
              }}
              className="block w-full px-4 py-3 text-left font-mono text-meta uppercase text-foreground-soft transition-colors hover:bg-subtle hover:text-accent disabled:opacity-60"
            >
              {signingOut ? 'Logging out' : 'Log out'}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
