'use client';

import type { Event } from '@/data/events';
import { cn, registrationClosed } from '@/lib/utils';
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

  /* Checked again here, on the click, rather than trusting the `disabled` the
     server worked out. The homepage is prerendered and revalidates on a timer,
     so a copy of it can outlive the cutoff by a few minutes — and somebody who
     left the tab open over lunch is holding a copy that is hours stale. This
     is a client island, so `new Date()` here is the real present. */
  const handleClick = () => {
    if (registrationClosed(event.date)) return;
    open(event);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-haspopup="dialog"
      className={cn(className, disabled && 'cursor-default opacity-50')}
    >
      {children}
    </button>
  );
}
