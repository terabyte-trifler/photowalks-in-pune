import type { Metadata } from 'next';
import Link from 'next/link';
import { site } from '@/data/site';

/* ============================================================================
 * TERMS
 * ----------------------------------------------------------------------------
 * The other half of the footer's small print, and the other dead anchor.
 *
 * A community walking group does not need a contract written in the language
 * of one. What it does need, honestly stated: that walks happen in public and
 * carry ordinary risk, that people keep the rights to their own photographs,
 * that there are limits on what may be uploaded, and that photographing people
 * in the street comes with manners as well as law.
 * ========================================================================== */

export const metadata: Metadata = {
  title: `Terms · ${site.displayName}`,
  description:
    'The short version: walk safely, photograph considerately, keep the rights to your own work.',
};

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

export default function TermsPage() {
  return (
    <section className="py-[clamp(2.5rem,6vw,4.5rem)]" aria-labelledby="terms-title">
      <div className="shell max-w-[860px]">
        {/* Label only, no frame number: the contact-sheet index means a section's
            position in the homepage scroll, and this page is not in it. The numbers
            below are clause numbers, which do mean something. */}
        <div className="mb-[clamp(2rem,4vw,3.5rem)] flex items-baseline">
          <span className="meta label-rule flex flex-1 items-center tracking-[0.22em]">
            Terms
          </span>
        </div>

        <h1 id="terms-title" className="display text-display-lg">
          Walk safely.
          <br />
          Photograph kindly.
        </h1>
        <p className="mt-5 max-w-[56ch] font-display text-lead text-foreground-soft">
          This is a community of people who like to walk with a camera. These are
          the few things worth writing down.
        </p>
        <p className="meta mt-6">Last updated · {LAST_UPDATED}</p>

        <div className="mt-[clamp(2.5rem,5vw,4rem)] space-y-[clamp(2rem,4vw,2.75rem)]">
          <Clause index="01" title="Walks are free, and informal">
            <p>
              Our walks cost nothing and are run by volunteers. We are not a tour
              company. We pick a place and a time, we meet, and we walk. Plans can
              change for weather or for the city — if that happens we will tell you
              on the number you gave us.
            </p>
            <p>
              Holding a spot is a courtesy to the people who could not get one. If
              you cannot make it, cancel from{' '}
              <Link
                href="/my-walks"
                className="text-foreground underline underline-offset-4 transition-colors hover:text-accent"
              >
                your walks
              </Link>{' '}
              so somebody else can come.
            </p>
          </Clause>

          <Clause index="02" title="You look after yourself">
            <p>
              A photowalk happens on public streets. There is traffic, there are
              uneven pavements, there is monsoon weather, and there is a camera in
              your hands taking your attention. You are responsible for your own
              safety and for your own belongings, and you join a walk at your own
              risk.
            </p>
            <p>
              Please come only if you are well enough for a few hours of walking, and
              tell an organiser on the day if you need to sit something out. If you
              are under 18, come with a parent or guardian.
            </p>
          </Clause>

          <Clause index="03" title="Your photographs stay yours">
            <p>
              You keep full copyright in everything you make on our walks and
              everything you upload here. We claim no ownership of it.
            </p>
            <p>
              By putting a photograph on your profile you are asking us to display it
              on this site — on your profile and in the community pages — and giving
              us permission to do that, and nothing more. If we ever want to use one
              of your photographs anywhere else, on Instagram or in print, we will
              ask you first and credit you. Take a photograph down at any time and
              that permission ends with it.
            </p>
          </Clause>

          <Clause index="04" title="What not to upload">
            <p>Please do not upload anything that:</p>
            <ul className="ml-4 list-disc space-y-1.5 marker:text-accent">
              <li>you did not photograph, or do not have the right to publish</li>
              <li>is sexual, hateful, or made to harass or humiliate somebody</li>
              <li>shows a person in a private moment they would not want published</li>
              <li>identifies a child without their parent&apos;s agreement</li>
            </ul>
            <p>
              We may remove a photograph or an account that breaks this, and we would
              rather have a conversation about it than a rule.
            </p>
          </Clause>

          <Clause index="05" title="Photographing people">
            <p>
              Street photography is legal in public places in India, and we would
              still ask you to use judgement. A raised eyebrow means no. Somebody who
              asks you to delete a frame should have it deleted. Nobody is obliged to
              be your subject, and a photograph is rarely worth somebody&apos;s
              discomfort.
            </p>
            <p>
              Photographs are often taken on our walks, and you may appear in
              somebody else&apos;s frame. If you would rather not, say so at the
              start and we will pass it on.
            </p>
          </Clause>

          <Clause index="06" title="Your account">
            <p>
              Keep your password to yourself, and use an account that is really
              yours. Do not impersonate somebody else, and do not take a username in
              order to hold it hostage.
            </p>
            <p>
              You may delete your account whenever you like, and everything in it
              goes at the same time — see{' '}
              <Link
                href="/privacy"
                className="text-foreground underline underline-offset-4 transition-colors hover:text-accent"
              >
                privacy
              </Link>
              . We may suspend an account that is being used to harass people or to
              attack the site.
            </p>
          </Clause>

          <Clause index="07" title="The site itself">
            <p>
              We run this carefully but we cannot promise it will never be down or
              never lose something. Keep your own copies of your photographs — the
              versions here are resized for the web and are not a backup of your
              originals.
            </p>
          </Clause>

          <Clause index="08" title="Changes, and talking to us">
            <p>
              If these terms change in a way that matters we will say so here and
              move the date at the top. Anything you want to raise, write to{' '}
              <a
                href={site.links.email}
                className="text-foreground underline underline-offset-4 transition-colors hover:text-accent"
              >
                {site.links.emailAddress}
              </a>
              . These terms are governed by the law of India, and the courts of Pune,
              Maharashtra.
            </p>
          </Clause>
        </div>

        <div className="mt-[clamp(3rem,6vw,4.5rem)] border-t border-border pt-6">
          <Link
            href="/privacy"
            className="font-mono text-micro uppercase text-muted underline underline-offset-4 transition-colors hover:text-accent"
          >
            ← Privacy
          </Link>
        </div>
      </div>
    </section>
  );
}
