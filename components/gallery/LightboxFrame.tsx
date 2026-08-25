'use client';

import Image from 'next/image';
import { useEffect, type ReactNode } from 'react';

import { Dialog, DialogClose } from '@/components/ui/Dialog';
import { padIndex } from '@/lib/utils';

/* ============================================================================
 * THE VIEWER ITSELF
 * ----------------------------------------------------------------------------
 * Lifted out of PhotoLightbox, which read everything from the gallery context
 * and so could only ever show the archive. The walk pages need the same viewer
 * over a different set of photographs, and two of these would drift: one would
 * get a keyboard shortcut, or a caption line, and the other would not.
 *
 * So this knows nothing about where its photographs come from. It is given one
 * frame and told how to ask for the next.
 * ========================================================================== */

export function LightboxFrame({
  open,
  index,
  count,
  src,
  alt,
  /** Printed bottom left. Whatever the caller thinks belongs under a frame. */
  footer,
  onClose,
  onStep,
}: {
  open: boolean;
  index: number | null;
  count: number;
  src: string | null;
  alt: string;
  footer?: ReactNode;
  onClose: () => void;
  onStep: (delta: number) => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') onStep(-1);
      if (event.key === 'ArrowRight') onStep(1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onStep]);

  return (
    <Dialog open={open} onClose={onClose} label="Photograph viewer" variant="full">
      {src && index !== null ? (
        <>
          <div className="flex items-center justify-between gap-4 border-b border-white/10 px-gutter py-4 text-[rgba(245,241,234,0.75)]">
            <span className="font-mono text-meta uppercase">
              Frame {padIndex(index + 1)} / {padIndex(count)}
            </span>
            <DialogClose onClose={onClose} />
          </div>

          <div className="grid min-h-0 flex-1 place-items-center p-[clamp(1rem,3vw,2.5rem)]">
            <Image
              src={src}
              alt={alt}
              width={1600}
              height={1600}
              quality={82}
              className="h-auto max-h-full w-auto max-w-full object-contain"
            />
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-white/10 px-gutter py-4 text-[rgba(245,241,234,0.75)]">
            <span className="font-mono text-micro uppercase">{footer}</span>

            <span className="flex gap-6">
              <button
                type="button"
                onClick={() => onStep(-1)}
                disabled={count < 2}
                className="font-mono text-meta uppercase transition-colors hover:text-accent disabled:cursor-default disabled:opacity-30"
              >
                ← Prev
              </button>
              <button
                type="button"
                onClick={() => onStep(1)}
                disabled={count < 2}
                className="font-mono text-meta uppercase transition-colors hover:text-accent disabled:cursor-default disabled:opacity-30"
              >
                Next →
              </button>
            </span>
          </div>
        </>
      ) : (
        <div />
      )}
    </Dialog>
  );
}
