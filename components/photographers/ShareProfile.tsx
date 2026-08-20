'use client';

import { useEffect, useRef, useState } from 'react';

/* ============================================================================
 * SHARE A PROFILE
 * ----------------------------------------------------------------------------
 * Two behaviours behind one button, because a phone and a laptop want opposite
 * things here.
 *
 *   phone     the operating system's own share sheet, which already knows
 *             about WhatsApp — and this community lives on WhatsApp, so that
 *             is one press to the place people would actually send it
 *   laptop    copy the link, because there is no share sheet worth opening and
 *             a copied URL is what somebody is going to paste anyway
 *
 * WHY THE LABEL ONLY SETTLES AFTER MOUNT
 * `navigator.share` does not exist on the server and is missing on most
 * desktop browsers, so which of the two this is cannot be known while
 * rendering. Deciding during render would mean the server sends "Copy link"
 * and the phone wants "Share" — a hydration mismatch, and the sort that only
 * shows up on other people's devices. So it renders one neutral label and
 * settles once it can actually ask.
 *
 * The URL is read from the address bar rather than passed in, so it is right
 * on a preview deployment, on localhost and in production without anybody
 * remembering to configure it.
 * ========================================================================== */

type State = 'idle' | 'copied' | 'failed';

/**
 * Two routes, because the modern one is not always allowed. Brave denies
 * clipboard-write by default — `permissions.query` reports "denied" before the
 * call is even made — and it is a browser photographers plausibly use. The
 * older execCommand path still works there, so it is worth keeping rather than
 * telling somebody to press a key combination for a selection that does not
 * exist.
 */
async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    /* Fall through to the older route. */
  }

  try {
    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    /* Off-screen rather than hidden: display:none cannot hold a selection. */
    field.style.cssText = 'position:fixed;top:-1000px;opacity:0';
    document.body.appendChild(field);
    field.select();
    field.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(field);
    return ok;
  } catch {
    return false;
  }
}

export function ShareProfile({ fullName }: { fullName: string }) {
  const [canShare, setCanShare] = useState(false);
  const [state, setState] = useState<State>('idle');
  /* Only set when both copy routes fail, so the address can be read off. */
  const [visibleUrl, setVisibleUrl] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  function flash(next: State) {
    setState(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState('idle'), 2400);
  }

  async function handleShare() {
    const url = window.location.href;

    if (canShare) {
      try {
        await navigator.share({
          title: `${fullName} · Photowalks in Pune`,
          text: `${fullName} photographs with Photowalks in Pune.`,
          url,
        });
        return;
      } catch (error) {
        /* Dismissing the sheet rejects with AbortError. That is somebody
           changing their mind, not a failure, and it should leave no trace. */
        if (error instanceof Error && error.name === 'AbortError') return;
        /* Anything else: fall through and copy instead. */
      }
    }

    if (await copyToClipboard(url)) {
      flash('copied');
    } else {
      /* Both copy routes refused. Rather than claim success or offer advice
         that does not work, show the address so it can be copied by hand. */
      setVisibleUrl(url);
      flash('failed');
    }
  }

  const label =
    state === 'copied'
      ? 'Link copied'
      : state === 'failed'
        ? 'Copy this link'
        : canShare
          ? 'Share profile'
          : 'Copy link';

  return (
    <span className="inline-flex flex-wrap items-center gap-x-4 gap-y-2">
      <button
        type="button"
        onClick={handleShare}
        className="cta"
        /* The label changes under the pointer, so it is announced rather than
           silently swapped for anybody listening to the page. */
        aria-live="polite"
      >
        {label}{' '}
        <span aria-hidden="true">{state === 'copied' ? '✓' : canShare ? '↗' : '⧉'}</span>
      </button>

      {state === 'failed' && visibleUrl && (
        <input
          readOnly
          value={visibleUrl}
          aria-label="Profile link"
          onFocus={(event) => event.currentTarget.select()}
          className="w-[min(22rem,60vw)] border-b border-border-strong bg-transparent pb-1 font-mono text-micro text-foreground-soft focus:border-accent focus:outline-none"
        />
      )}
    </span>
  );
}
