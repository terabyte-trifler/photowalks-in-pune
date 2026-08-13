'use client';

import type { Event } from '@/data/events';
import { cn } from '@/lib/utils';
import { useRSVP } from './RSVPProvider';

/**
 * The smallest possible client island: a button that opens the RSVP modal.
 * Lets the hero, the featured walk and the header stay server-rendered.
 */
export function RSVPButton({
  event,
  children,
  className = 'cta',
  disabled = false,
  ariaLabel,
}: {
  event: Event;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const { open } = useRSVP();

  return (
    <button
      type="button"
      onClick={() => open(event)}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-haspopup="dialog"
      className={cn(className, disabled && 'cursor-default opacity-50')}
    >
      {children}
    </button>
  );
}
