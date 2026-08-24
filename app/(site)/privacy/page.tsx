import type { Metadata } from 'next';
import Link from 'next/link';
import { site } from '@/data/site';

/* ============================================================================
 * PRIVACY
 * ----------------------------------------------------------------------------
 * The footer promised this page and linked to `#privacy`, an anchor that goes
 * nowhere — on a site that asks people for a phone number. That is the kind of
 * gap nobody notices until somebody asks where their number went.
 *
 * Everything stated here was checked against the code rather than written from
 * a template. The list of what is collected comes from the RSVP form and the
 * profiles table; the claim that RSVPs are private comes from the Row Level
 * Security policy on walk_rsvps; the claim that deletion is immediate comes
 * from the delete-account function and the storage purge trigger. If any of
 * those change, this page is wrong and needs changing with them.
 * ========================================================================== */

export const metadata: Metadata = {
  title: `Privacy · ${site.displayName}`,
  description:
    'What Photowalks in Pune collects, why, who can see it, and how to have all of it deleted.',
};

/** Kept beside the text so the date is never a guess. */
const LAST_UPDATED = '20 August 2026';

function Clause({
  index,
  title,
  children,
}: {
  index: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border pt-[clamp(1.5rem,3vw,2rem)]">
      <div className="flex items-baseline gap-4">
        <span className="font-mono text-micro tracking-[0.2em] text-accent">{index}</span>
        <h2 className="display text-display-sm">{title}</h2>
      </div>
      <div className="mt-4 max-w-[62ch] space-y-4 text-body text-foreground-soft">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <section className="py-[clamp(2.5rem,6vw,4.5rem)]" aria-labelledby="privacy-title">
      <div className="shell max-w-[860px]">
        {/* Label only, no frame number: the contact-sheet index means a section's
            position in the homepage scroll, and this page is not in it. The numbers
            below are clause numbers, which do mean something. */}
        <div className="mb-[clamp(2rem,4vw,3.5rem)] flex items-baseline">
          <span className="meta label-rule flex flex-1 items-center tracking-[0.22em]">
            Privacy
          </span>
        </div>

        <h1 id="privacy-title" className="display text-display-lg">
          What we keep,
          <br />
          and what we don&apos;t.
        </h1>
        <p className="mt-5 max-w-[56ch] font-display text-lead text-foreground-soft">
          We are a small photography community in Pune, not a company with a data
          department. This page says plainly what we hold, why we hold it, and how
          to make it go away.
        </p>
        <p className="meta mt-6">Last updated · {LAST_UPDATED}</p>

        <div className="mt-[clamp(2.5rem,5vw,4rem)] space-y-[clamp(2rem,4vw,2.75rem)]">
          <Clause index="01" title="What we ask for">
            <p>
              <strong className="text-foreground">To join a walk</strong> we ask for your
              name, email address and a WhatsApp number, and optionally your
              Instagram handle and how long you have been photographing. The number
              is the one thing we genuinely need: it is how the meeting point and any
              last-minute change of plan reaches you on the morning.
            </p>
            <p>
              <strong className="text-foreground">To have an account</strong> we store the
              email address you sign in with. If you sign in with Google we receive
              your name, email address and profile picture from Google, and nothing
              else. We never see your password — that is held by Supabase, our
              authentication provider, and it is never sent to us in a readable form.
            </p>
            <p>
              <strong className="text-foreground">On your profile</strong> everything is
              optional except the name and username created when you sign up: a
              photograph of you, a short biography, your city, your Instagram handle,
              your website, and the kinds of photography you like. Anything you put
              here you are choosing to publish.
            </p>
            <p>
              <strong className="text-foreground">Your photographs</strong> stay yours. We
              store the files you upload so they can appear on your profile, and we
              resize them before upload so they load quickly. We claim no ownership
              and we do not license them to anybody.
            </p>
          </Clause>

          <Clause index="02" title="What is public, and what is not">
            <p>
              Your profile and your photographs are public. That is the point of the
              directory — people come to it to find photographers to walk with. Your
              name, username, picture, biography, city, links and photographs can be
              seen by anybody, signed in or not.
            </p>
            <p>
              <strong className="text-foreground">
                Your contact details are not public, and are not visible to other
                members.
              </strong>{' '}
              Your email address and your WhatsApp number are never shown on the site
              and cannot be read through it. A profile can say that somebody walked a
              particular walk, because attendance is part of what the directory is
              for — but the record it reads from carries only the walk and the date,
              never a way to contact anybody.
            </p>
          </Clause>

          <Clause index="03" title="What we do with it">
            <p>
              We use your contact details to run the walk you signed up for and
              nothing else. We do not sell anything to anybody, we do not share your
              details with advertisers, and we do not run advertising or
              cross-site tracking on this site.
            </p>
            <p>
              We do not send marketing email unless you have asked for it. If you
              subscribe to the newsletter you can stop at any time by replying to it
              or writing to us.
            </p>
          </Clause>

          <Clause index="04" title="Who else touches it">
            <p>
              Three services make this site work, and each holds some of the above:{' '}
              <span className="text-foreground">Supabase</span>, which stores the
              database, the files and the sign-in system;{' '}
              <span className="text-foreground">Vercel</span>, which serves the site;
              and <span className="text-foreground">Google</span>, only if you choose
              to sign in with it. We do not hand your details to anybody else.
            </p>
            <p>
              Our database is hosted in Mumbai. Some of these providers may process
              data outside India in the course of running their services.
            </p>
          </Clause>

          <Clause index="05" title="Deleting it">
            <p>
              You can delete your account yourself, from{' '}
              <Link href="/settings" className="text-foreground underline underline-offset-4 transition-colors hover:text-accent">
                your settings
              </Link>
              . When you do, your profile, your photographs, the image files
              themselves and the record of every walk you joined are removed from our
              database and our storage at the same time. They are not hidden, not
              archived, and not kept as a backup. It cannot be undone.
            </p>
            <p>
              You can also delete a single photograph at any time, and the file goes
              with the record rather than lingering in storage.
            </p>
            <p>
              If you would rather ask us to do it, write to{' '}
              <a
                href={site.links.email}
                className="text-foreground underline underline-offset-4 transition-colors hover:text-accent"
              >
                {site.links.emailAddress}
              </a>{' '}
              and we will remove everything and confirm when it is done.
            </p>
          </Clause>

          <Clause index="06" title="Keeping it safe">
            <p>
              Access to your data is enforced by the database itself, not by the
              screens in front of it: the rules that decide who may read or change a
              row live in Postgres, so they hold even for a request that never went
              through this website. Uploads are restricted to your own folder and to
              image files. The connection is encrypted.
            </p>
            <p>
              We will not pretend this is a bank. It is a community site run by
              people who walk with cameras, and it holds nothing more sensitive than
              a phone number — but we would rather that number were looked after
              properly, and it is.
            </p>
          </Clause>

          <Clause index="07" title="Children">
            <p>
              Accounts are for people aged 13 and over. Younger photographers are
              very welcome on a walk — come with a parent or guardian, and let them
              hold the account.
            </p>
          </Clause>

          <Clause index="08" title="Asking us something">
            <p>
              If you want to know what we hold about you, correct it, or have it
              deleted, write to{' '}
              <a
                href={site.links.email}
                className="text-foreground underline underline-offset-4 transition-colors hover:text-accent"
              >
                {site.links.emailAddress}
              </a>
              . A person reads it, and we will answer.
            </p>
            <p>
              If this page changes in a way that matters, we will say so here and
              move the date at the top.
            </p>
          </Clause>
        </div>

        <div className="mt-[clamp(3rem,6vw,4.5rem)] border-t border-border pt-6">
          <Link
            href="/terms"
            className="font-mono text-micro uppercase text-muted underline underline-offset-4 transition-colors hover:text-accent"
          >
            Terms →
          </Link>
        </div>
      </div>
    </section>
  );
}
