import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AuthShell } from '@/components/auth/AuthShell';
import { site } from '@/data/site';
import { getCurrentUser } from '@/lib/auth/session';
import { isSupabaseConfigured } from '@/lib/supabase/config';
import { ResetPasswordForm } from './ResetPasswordForm';

export const metadata: Metadata = {
  title: `Set a new password · ${site.displayName}`,
};

/**
 * Reached only through the link in the reset email: /auth/callback exchanges
 * the recovery code for a session and sends people here. No session means the
 * link was expired, already used, or opened in a different browser from the
 * one that asked — so say that instead of showing a form that cannot work.
 */
export default async function ResetPasswordPage() {
  if (isSupabaseConfigured()) {
    const user = await getCurrentUser();
    if (!user) redirect('/forgot-password?error=expired');
  }

  return (
    <AuthShell
      frame="Frame 04"
      eyebrow="New password"
      title={
        <>
          Set a new
          <br />
          password.
        </>
      }
      standfirst="Choose something you have not used here before. You will stay logged in on this device."
      image="/images/walks/mandai.jpg"
      imageAlt="Placeholder for a photograph made in Mahatma Phule Mandai, Pune"
      caption="Mandai · Saturday morning"
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
