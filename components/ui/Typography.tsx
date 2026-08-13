import { cn } from '@/lib/utils';

/**
 * Section header. The index is not decoration — it is the position of this
 * section in the scroll, matching the frame numbers on the contact-sheet rail.
 */
export function SectionHeader({
  index,
  label,
  className,
}: {
  index: string;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn('mb-[clamp(2rem,4vw,3.5rem)] flex items-baseline gap-5', className)}>
      <span className="font-mono text-meta tracking-[0.14em] text-accent">{index}</span>
      <span className="meta label-rule flex flex-1 items-center tracking-[0.2em]">{label}</span>
    </div>
  );
}

/** Metadata line. */
export function Meta({
  children,
  className,
  as: Tag = 'p',
}: {
  children: React.ReactNode;
  className?: string;
  as?: 'p' | 'span' | 'div';
}) {
  return <Tag className={cn('meta', className)}>{children}</Tag>;
}
