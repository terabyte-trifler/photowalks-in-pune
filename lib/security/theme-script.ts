/* ============================================================================
 * THE SCRIPT THAT RUNS BEFORE THE FIRST PAINT
 * ----------------------------------------------------------------------------
 * Without this, every visit to a dark-mode site starts with a white flash: the
 * HTML arrives with no theme on it, the browser paints, and only then does
 * React hydrate and set the attribute. On a page whose background is #14110e
 * that flash is the whole screen.
 *
 * So the choice is applied synchronously in <head>, before the body renders.
 * It reads localStorage, and writes nothing when the answer is "follow the
 * system" — the absence of data-theme is what the CSS media query keys on.
 *
 * IT HAS TO BE INLINE, AND THE CSP HAS TO KNOW
 * An external file would be a second round trip, and the flash is exactly the
 * time that round trip takes. But this app's CSP uses 'strict-dynamic' on
 * every rendered-per-request page, and strict-dynamic ignores 'self' — so an
 * external file would need the nonce just as much, and an inline script is
 * refused outright unless the policy names it.
 *
 * Naming it by hash rather than nonce is what keeps the three static pages
 * static: a nonce is per-request and would force them to render per request,
 * which is the trade the CSP work went to some trouble to avoid. A hash is
 * fixed, so the same policy string works on a prerendered page and a dynamic
 * one alike.
 *
 * The hash is checked against the source by `npm run check:csp`, so the two
 * cannot drift apart quietly — and quiet is exactly how they would drift,
 * since the only symptom is the flash coming back.
 * ========================================================================== */

/**
 * Kept deliberately small and dependency-free: it runs on the critical path,
 * before anything else on the page.
 *
 * The try/catch matters. localStorage throws outright in Safari's private
 * browsing and wherever cookies are blocked, and an exception here would stop
 * the parser before the page had rendered at all.
 */
export const THEME_SCRIPT = `(function(){try{var t=localStorage.getItem('pwip.theme');if(t==='dark'||t==='light'){document.documentElement.setAttribute('data-theme',t)}}catch(e){}})();`;

/**
 * SHA-256 of THEME_SCRIPT exactly as it appears above, base64, for the CSP's
 * script-src. Regenerate with `npm run check:csp --fix` if the script changes.
 */
export const THEME_SCRIPT_HASH = "sha256-vk00bdWsoNz+cJ+yH2/RRy4J5lnzcBwig0+VZEchhZo=";
