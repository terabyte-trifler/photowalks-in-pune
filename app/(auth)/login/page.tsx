import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/AuthShell';
import { site } from '@/data/site';
import { getEnabledProviders } from '@/lib/auth/providers';
import { LoginForm } from './LoginForm';

export const metadata: Metadata = {
  title: `Log in · ${site.displayName}`,
  description: 'Log in to your Photowalks in Pune account.',
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reason?: string; error?: string; message?: string }>;
}) {
  const [params, providers] = await Promise.all([searchParams, getEnabledProviders()]);

  return (
    <AuthShell
      frame="Frame 02"
      eyebrow="Log in"
      title={
        <>
          Good to see
          <br />
          you again.
        </>
      }
      standfirst="Pick up where you left off — your walks, your archive, your profile."
      image="/images/walks/river.jpg"
      imageAlt="A woman in a patterned sari sitting on the ghat steps beside the water, arches behind her"
      caption="Mula-Mutha · 6:00 PM"
      footer={
        <p className="font-mono text-micro uppercase text-muted">
          New here?{' '}
          <Link href="/signup" className="text-foreground transition-colors hover:text-accent">
            Create an account →
          </Link>
        </p>
      }
    >
      <LoginForm
        googleEnabled={providers.google}
        next={params.next}
        reason={params.reason}
        callbackError={params.error}
        message={params.message}
      />
    </AuthShell>
  );
}
