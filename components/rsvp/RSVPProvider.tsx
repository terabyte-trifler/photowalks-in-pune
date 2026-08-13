'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Event } from '@/data/events';
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
