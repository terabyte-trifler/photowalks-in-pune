#!/usr/bin/env node
/* ============================================================================
 * APPLY THE BRANDED AUTH EMAILS
 * ----------------------------------------------------------------------------
 * Supabase refuses email template edits on the free tier while the project is
 * using the built-in sender:
 *
 *   "Email template modification is not available for free tier projects
 *    using the default email provider."
 *
 * So supabase/templates/ sat written but dormant. This script is what runs the
 * moment custom SMTP exists — it checks first, applies the three templates,
 * lifts the send limit off the built-in cap of 2 an hour, and then proves the
 * reset flow end to end rather than assuming it.
 *
 * WHY NOT `supabase config push`
 * Because it would take the Google button down. config.toml declares only
 * [auth.external.apple], while the live project has external_google_enabled =
 * true, so pushing the whole file disables Google sign-in as a side effect of
 * changing an email template. This patches individual fields instead.
 *
 * USAGE
 *   SUPABASE_ACCESS_TOKEN=sbp_... node scripts/apply-email-branding.mjs --check
 *   SUPABASE_ACCESS_TOKEN=sbp_... node scripts/apply-email-branding.mjs --apply
 *
 * --check reports what it would do and changes nothing. The access token comes
 * from https://supabase.com/dashboard/account/tokens and is not a key that
 * belongs anywhere near the app's environment.
 * ========================================================================== */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const REF = process.env.SUPABASE_PROJECT_REF ?? 'gcyweszlvjkguvbzfwlj';
const APPLY = process.argv.includes('--apply');

if (!TOKEN) {
  console.error('Need SUPABASE_ACCESS_TOKEN (https://supabase.com/dashboard/account/tokens).');
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const api = `https://api.supabase.com/v1/projects/${REF}/config/auth`;
const headers = { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' };

const tpl = (name) => readFileSync(join(root, 'supabase/templates', `${name}.html`), 'utf8');

/** Subjects live here and in config.toml; both are read by a person, only this is read by the API. */
const TEMPLATES = [
  ['recovery', 'Set a new password · Photowalks in Pune'],
  ['confirmation', 'Confirm your email · Photowalks in Pune'],
  ['email_change', 'Confirm your new email · Photowalks in Pune'],
];

const config = await fetch(api, { headers }).then((r) => r.json());

// ---------------------------------------------------------------------------
// 1 · Is there an SMTP provider yet?
// ---------------------------------------------------------------------------
console.log('\nCurrent state');
console.log(`  SMTP host           ${config.smtp_host || '(none — built-in sender)'}`);
console.log(`  Sender              ${config.smtp_admin_email || '(none)'}`);
console.log(`  Emails per hour     ${config.rate_limit_email_sent}`);
console.log(`  Recovery subject    ${JSON.stringify(config.mailer_subjects_recovery)}`);

if (!config.smtp_host) {
  console.error(
    '\nNo custom SMTP is configured, so Supabase will refuse the template edit.\n' +
      'Set it in Authentication -> Emails -> SMTP Settings first. For Resend:\n' +
      '  host smtp.resend.com   port 587   user resend   pass <api key>\n' +
      'Resend requires a verified domain — it will not send from an unverified one.\n',
  );
  process.exit(1);
}

if (!APPLY) {
  console.log('\n--check only. Re-run with --apply to write the templates.\n');
  process.exit(0);
}

// ---------------------------------------------------------------------------
// 2 · Apply the templates and lift the send limit
// ---------------------------------------------------------------------------
const body = { rate_limit_email_sent: 30 };
for (const [name, subject] of TEMPLATES) {
  body[`mailer_subjects_${name}`] = subject;
  body[`mailer_templates_${name}_content`] = tpl(name);
}

const res = await fetch(api, { method: 'PATCH', headers, body: JSON.stringify(body) });
if (!res.ok) {
  console.error(`\nPATCH failed (${res.status}): ${(await res.text()).slice(0, 300)}\n`);
  process.exit(1);
}
console.log('\nApplied. Verifying against the live project rather than trusting the 200.');

// ---------------------------------------------------------------------------
// 3 · Read it back — a 200 is not evidence the content landed
// ---------------------------------------------------------------------------
const after = await fetch(api, { headers }).then((r) => r.json());
let ok = true;
for (const [name, subject] of TEMPLATES) {
  const liveSubject = after[`mailer_subjects_${name}`];
  const liveBody = after[`mailer_templates_${name}_content`] ?? '';
  const branded = liveBody.includes('Photowalks in Pune');
  const clean = !/supabase/i.test(liveBody.replace(/https:\/\/[^\s"']*supabase[^\s"']*/gi, ''));
  const good = liveSubject === subject && branded && clean;
  if (!good) ok = false;
  console.log(
    `  ${name.padEnd(13)} subject ${liveSubject === subject ? 'ok' : 'MISMATCH'} · ` +
      `body ${branded ? 'branded' : 'NOT BRANDED'} · ${clean ? 'no Supabase in copy' : 'STILL MENTIONS SUPABASE'}`,
  );
}
console.log(`  rate limit    ${after.rate_limit_email_sent} an hour`);

console.log(
  ok
    ? '\nDone. Send yourself a reset from /forgot-password and check the From line.\n' +
        'It reads "Photowalks in Pune" only if the SMTP sender name is set too.\n'
    : '\nSomething did not land — see the mismatches above.\n',
);
process.exit(ok ? 0 : 1);
