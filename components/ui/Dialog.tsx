'use client';

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Accessible dialog shell used by the RSVP modal, the story overlay and the
 * lightbox: Escape closes, focus is trapped while open, focus returns to the
 * trigger on close, and the page behind cannot scroll.
 */
export function Dialog({
  open,
  onClose,
  label,
  children,
  variant = 'panel',
  className,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: ReactNode;
  variant?: 'panel' | 'full';
  className?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const reduced = useReducedMotion();

  const handleKey = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) return;

      const nodes = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (nodes.length === 0) return;

      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  useEffect(() => {
    if (!open) return;

    triggerRef.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKey);

    const raf = requestAnimationFrame(() => {
      panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    });

    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = previousOverflow;
      if (triggerRef.current?.isConnected) triggerRef.current.focus();
    };
  }, [open, handleKey]);

  const fade = reduced ? { duration: 0 } : { duration: 0.25 };
  const rise = reduced
    ? { initial: {}, animate: {}, exit: {}, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, y: 16 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: 8 },
        transition: { duration: 0.35, ease: [0.16, 1, 0.3, 1] as const },
      };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={cn(
            'fixed inset-0 z-[100]',
            variant === 'panel'
              ? 'grid place-items-center bg-[rgba(14,12,10,0.55)] p-gutter backdrop-blur-[6px]'
              : 'bg-[rgba(9,8,7,0.96)]',
          )}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={fade}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onClose();
          }}
        >
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            className={cn(
              variant === 'panel'
                ? 'max-h-[88vh] w-full overflow-y-auto border border-border-strong bg-background p-[clamp(1.5rem,4vw,2.75rem)]'
                : 'flex h-full w-full flex-col',
              className,
            )}
            {...rise}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function DialogClose({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      className="font-mono text-meta uppercase text-muted transition-colors hover:text-accent"
    >
      Close ✕
    </button>
  );
}
