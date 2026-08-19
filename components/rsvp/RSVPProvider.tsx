'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { upcomingWalks, type Event } from '@/data/events';
import { useAuth } from '@/components/auth/AuthProvider';
import { RSVPModal } from './RSVPModal';

interface RSVPContextValue {
  open: (event: Event) => void;
  close: () => void;
}

const RSVPContext = createContext<RSVPContextValue | null>(null);

/**
 * Holds the one piece of state that crosses section boundaries: which walk is
 * being booked. Its children stay server components — only the buttons that
 * call `open` need to be client.
 */
export function RSVPProvider({ children }: { children: ReactNode }) {
  const [event, setEvent] = useState<Event | null>(null);
  const { user } = useAuth();

  /**
   * Somebody pressed "join a walk" while signed out, went off to log in, and
   * has just come back. `?rsvp=<slug>` says which walk they meant, so the
   * dialog reopens on it instead of dropping them on the homepage to find it
   * again.
   *
   * Read from window rather than useSearchParams: this provider wraps the
   * homepage, and useSearchParams would force it out of static rendering (or
   * demand a Suspense boundary) for what is only a post-hydration nicety.
   */
  useEffect(() => {
    if (!user) return;

    const params = new URLSearchParams(window.location.search);
    const slug = params.get('rsvp');
    if (!slug) return;

    /* Clear it either way, so a refresh does not reopen the dialog. */
    params.delete('rsvp');
    const query = params.toString();
    window.history.replaceState(
      null,
      '',
      window.location.pathname + (query ? `?${query}` : '') + window.location.hash,
    );

    const walk = upcomingWalks.find((candidate) => candidate.slug === slug);
    if (walk) setEvent(walk);
  }, [user]);

  const open = useCallback((next: Event) => setEvent(next), []);
  const close = useCallback(() => setEvent(null), []);
  const value = useMemo(() => ({ open, close }), [open, close]);

  return (
    <RSVPContext.Provider value={value}>
      {children}
      <RSVPModal event={event} onClose={close} />
    </RSVPContext.Provider>
  );
}

export function useRSVP(): RSVPContextValue {
  const context = useContext(RSVPContext);
  if (!context) throw new Error('useRSVP must be used inside <RSVPProvider>');
  return context;
}
