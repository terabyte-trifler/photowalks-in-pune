import { cn } from '@/lib/utils';

/**
 * The form-level message: a failed sign-in, a sent email, or the notice that
 * this build has no Supabase project attached. Same shape as the "preview
 * build" strip on the RSVP confirmation — a rule down the left, mono caps.
 */
export function AuthNotice({
  tone,
  children,
  className,
}: {
  tone: 'error' | 'info' | 'success';
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'border-l-2 bg-subtle py-3 pl-4 pr-3 font-mono text-micro uppercase leading-[1.7]',
        tone === 'error'
          ? 'border-accent text-foreground'
          : tone === 'success'
            ? 'border-foreground text-foreground'
            : 'border-border-strong text-foreground-soft',
        className,
      )}
    >
      {children}
    </p>
  );
}
