/* ============================================================================
 * SIGNUP GUARD — the before-user-created hook
 * ----------------------------------------------------------------------------
 * Runs before an account exists and can refuse it. Two checks, in cost order.
 *
 *   1. Is the domain a known throwaway?  (a table lookup)
 *   2. Can the domain receive mail at all?  (a DNS question)
 *
 * WHY BOTH, AND WHY NOT "ONLY GMAIL"
 * Requiring gmail.com would reject Outlook, Proton, iCloud and every member
 * whose address is at their own portfolio domain — in a photography community
 * that is the membership worth having. It would not even stop repeat signups,
 * since Gmail ignores dots and accepts +suffixes. See migration 0017.
 *
 * WHY THE MX CHECK EARNS ITS PLACE, AND WHAT IT DOES NOT DO
 * It protects the one thing that cannot be repaired later. Email is the only
 * recovery path for a password account: somebody who signs up at a domain that
 * cannot receive mail can never reset their password and cannot be contacted
 * to fix it, and nobody finds out until they try. A domain with no MX and no A
 * record cannot receive mail from anyone, so refusing it costs nobody real
 * anything.
 *
 * It is NOT a typo catcher, which is what it was added believing. Measured
 * against the resolver this function uses:
 *
 *   gmial.com    SERVFAIL   -> allowed (fails open, see below)
 *   yahooo.com   1 MX       -> allowed
 *   outlok.com   1 MX       -> allowed
 *
 * Typosquats are registered *because* they catch typo traffic, so they have
 * live DNS and often working mail. What this check actually stops is a domain
 * that does not exist at all — NXDOMAIN — which is a narrower and more honest
 * claim than the one it was written under.
 *
 * IT FAILS OPEN, DELIBERATELY
 * Every infrastructure failure here — DNS unreachable, the table unreadable,
 * the budget spent — allows the signup. The hook has five seconds including
 * retries, and the alternative to failing open is a resolver hiccup silently
 * becoming "nobody can join this website". A throwaway address that slips
 * through is a row somebody can delete; a closed door is invisible.
 * ========================================================================== */

import { createClient } from 'jsr:@supabase/supabase-js@2';
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';

/* The hook's whole budget is 5s. DNS is the only unbounded wait here, so it
   gets a fraction of that and the rest is left for the verify and the query. */
const DNS_TIMEOUT_MS = 1_500;

const json = (body: unknown, status: number) =>
  new Response(JSON.stringify(body), {
    status,
    /* Required on every response, errors included. */
    headers: { 'Content-Type': 'application/json' },
  });

const allow = () => json({}, 200);

const refuse = (message: string) =>
  json({ error: { message, http_code: 400 } }, 400);

/**
 * Does this domain have anywhere to deliver mail?
 *
 * Asked over DNS-over-HTTPS rather than a resolver call: `fetch` is the one
 * network primitive an edge function can rely on, and Cloudflare's JSON API
 * answers in a few milliseconds from anywhere.
 *
 * MX first, then A. A domain with no MX but with an A record is still a valid
 * destination — RFC 5321 says the address record is the implicit mail exchange
 * — and small domains genuinely rely on that. Checking only MX would refuse
 * them.
 *
 * Returns true on any failure of our own, because see the header.
 */
async function canReceiveMail(domain: string): Promise<boolean> {
  const ask = async (type: 'MX' | 'A'): Promise<boolean> => {
    const response = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${type}`,
      {
        headers: { accept: 'application/dns-json' },
        signal: AbortSignal.timeout(DNS_TIMEOUT_MS),
      },
    );
    if (!response.ok) throw new Error(`resolver answered ${response.status}`);
    const body = await response.json();
    /* NXDOMAIN is 3. Anything else with no Answer section means "no records of
       this type", which is a real answer and not an error. */
    if (body.Status === 3) return false;
    if (body.Status !== 0) throw new Error(`resolver status ${body.Status}`);
    return Array.isArray(body.Answer) && body.Answer.length > 0;
  };

  try {
    if (await ask('MX')) return true;
    return await ask('A');
  } catch (error) {
    console.error('[signup-guard] dns check failed, allowing:', error);
    return true;
  }
}

Deno.serve(async (request) => {
  const payload = await request.text();

  /* ---------------------------------------------------------------------
   * Verify first, and refuse to run unverified.
   * ---------------------------------------------------------------------
   * This is the one failure that does NOT fail open. An unsigned request is
   * not Supabase asking a question, it is somebody else calling the endpoint,
   * and the safe answer to a stranger is nothing at all. A missing secret is
   * the same case: it means the function is misconfigured, and guessing is
   * worse than saying so.
   * ------------------------------------------------------------------- */
  const secret = Deno.env.get('BEFORE_USER_CREATED_HOOK_SECRET');
  if (!secret) {
    console.error('[signup-guard] BEFORE_USER_CREATED_HOOK_SECRET is not set');
    return json({ error: { message: 'Signups are misconfigured.', http_code: 500 } }, 500);
  }

  let email = '';
  try {
    const webhook = new Webhook(secret.replace('v1,whsec_', ''));
    const event = webhook.verify(payload, Object.fromEntries(request.headers)) as {
      user?: { email?: string };
    };
    email = (event.user?.email ?? '').trim().toLowerCase();
  } catch (error) {
    console.error('[signup-guard] signature rejected:', error);
    return json({ error: { message: 'Invalid request.', http_code: 401 } }, 401);
  }

  /* No email at all is not this hook's business — phone signups, and any
     future provider that does not carry one. */
  const domain = email.split('@')[1] ?? '';
  if (!domain) return allow();

  /* ---- 1. known throwaway? -------------------------------------------- */
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    );
    const { data, error } = await supabase
      .from('blocked_email_domains')
      .select('domain')
      .eq('domain', domain)
      .maybeSingle();

    if (error) {
      console.error('[signup-guard] blocklist unreadable, allowing:', error.message);
    } else if (data) {
      return refuse(
        'That looks like a temporary email address. Please use one you will still read next month — this is how we send walk details and how you would reset your password.',
      );
    }
  } catch (error) {
    console.error('[signup-guard] blocklist check failed, allowing:', error);
  }

  /* ---- 2. can it receive mail at all? --------------------------------- */
  if (!(await canReceiveMail(domain))) {
    return refuse(
      `We could not find a mail server for ${domain}. Check the spelling of your email address.`,
    );
  }

  return allow();
});
