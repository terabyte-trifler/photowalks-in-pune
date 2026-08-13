/* ============================================================================
 * NEWSLETTER
 * ----------------------------------------------------------------------------
 * Set NEXT_PUBLIC_NEWSLETTER_ENDPOINT to anything accepting POST { email } —
 * Buttondown, ConvertKit, or your own route handler. Without it, signups stay
 * in the visitor's browser and the success state says so.
 * ========================================================================== */

const STORAGE_KEY = 'pwip.subscribers';
const ENDPOINT = process.env.NEXT_PUBLIC_NEWSLETTER_ENDPOINT;

export interface SubscribeResult {
  ok: boolean;
  persisted: boolean;
  error?: string;
}

export const isNewsletterConfigured = (): boolean => Boolean(ENDPOINT);

export async function subscribe(email: string): Promise<SubscribeResult> {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return { ok: false, persisted: false, error: 'That email does not look right.' };
  }

  if (ENDPOINT) {
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) return { ok: false, persisted: false, error: 'That did not go through. Try again.' };
      return { ok: true, persisted: true };
    } catch {
      return { ok: false, persisted: false, error: 'That did not go through. Try again.' };
    }
  }

  await new Promise((resolve) => setTimeout(resolve, 450));
  const list: string[] = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '[]');
  if (!list.includes(email)) list.push(email);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  return { ok: true, persisted: false };
}
