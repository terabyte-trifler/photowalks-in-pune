import type { Metadata } from 'next';
import Link from 'next/link';
import { AuthShell } from '@/components/auth/AuthShell';
import { site } from '@/data/site';
import { ForgotPasswordForm } from './ForgotPasswordForm';

export const metadata: Metadata = {
  title: `Reset your password · ${site.displayName}`,
};

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <AuthShell
      frame="Frame 03"
      eyebrow="Password"
      title={
        <>
          It happens
          <br />
          to everyone.
        </>
      }
      standfirst="Tell us the email on your account and we will send a link to set a new password."
      image="/images/walks/monsoon.jpg"
      imageAlt="Placeholder for a monsoon photograph made on FC Road, Pune"
      caption="FC Road · after the rain"
      footer={
        <p className="font-mono text-micro uppercase text-muted">
          Remembered it?{' '}
          <Link href="/login" className="text-foreground transition-colors hover:text-accent">
            Back to log in →
          </Link>
        </p>
      }
    >
      <ForgotPasswordForm callbackError={params.error} />
    </AuthShell>
  );
}
