import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/AuthShell';
import { site } from '@/data/site';
import { getEnabledProviders } from '@/lib/auth/providers';
import { SignupForm } from './SignupForm';

export const metadata: Metadata = {
  title: `Join · ${site.displayName}`,
  description: 'Create your Photowalks in Pune account and walk with us.',
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const [params, providers] = await Promise.all([searchParams, getEnabledProviders()]);

  return (
    <AuthShell
      frame="Frame 01"
      eyebrow="Join"
      title={
        <>
          Come walk
          <br />
          with us.
        </>
      }
      standfirst="An account keeps your walks, your photographs and your profile in one place. Bring whatever camera you have."
      image="/images/walks/old-pune.jpg"
      imageAlt="An old Pune shopfront with its shutter down, Marathi signage above and a man walking past the railings"
      caption="Kasba Peth · 7:04 AM"
      footer={
        <p className="font-mono text-micro uppercase text-muted">
          Already have an account?{' '}
          <Link href="/login" className="text-foreground transition-colors hover:text-accent">
            Log in →
          </Link>
        </p>
      }
    >
      <SignupForm
        googleEnabled={providers.google} next={params.next} callbackError={params.error} />
    </AuthShell>
  );
}
