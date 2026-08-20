import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { SectionHeader } from '@/components/ui/Typography';
import { AuthNotice } from '@/components/auth/AuthNotice';
import { DeleteAccount } from '@/components/auth/DeleteAccount';
import { site } from '@/data/site';
import { getCurrentProfile } from '@/lib/auth/session';
import { SettingsForm } from './SettingsForm';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: `Settings · ${site.displayName}`,
  robots: { index: false, follow: false },
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const current = await getCurrentProfile();

  /* Re-checked here even though the middleware already redirects: a page that
     shows somebody's account must not depend on middleware being configured. */
  if (!current) redirect('/login?next=/settings');

  return (
    <section className="py-[clamp(2.5rem,6vw,4.5rem)]" aria-labelledby="settings-title">
      <div className="shell max-w-[860px]">
        <SectionHeader index="01" label="Settings" />

        <h1 id="settings-title" className="display text-display-lg">
          Your profile.
        </h1>
        <p className="mt-4 max-w-[52ch] font-display text-lead text-foreground-soft">
          This is what other photographers see. Everything here is public except your
          email, which we never publish.
        </p>

        {params.error === 'no-profile' && (
          <AuthNotice tone="error" className="mt-7">
            We could not find a profile for your account. If this is a fresh Supabase
            project, run the migration in supabase/migrations and sign up again.
          </AuthNotice>
        )}

        {current.profile ? (
          <div className="mt-[clamp(2rem,4vw,3rem)]">
            <SettingsForm profile={current.profile} email={current.user.email ?? ''} />
            <DeleteAccount username={current.profile.username} />
          </div>
        ) : (
          <div className="mt-[clamp(2rem,4vw,3rem)] border-l-2 border-accent bg-subtle py-5 pl-5 pr-4">
            <p className="max-w-[52ch] text-body text-foreground-soft">
              Your account exists, but it has no profile row yet. That happens when the
              database migration has not been run against this Supabase project — the
              profile is created by a trigger on sign-up, not by the app.
            </p>
            <Link href="/" className="cta mt-4">
              Back to the site <span aria-hidden="true">→</span>
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
