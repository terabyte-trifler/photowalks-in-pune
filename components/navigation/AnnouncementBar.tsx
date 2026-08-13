/** Server component. A thin editorial strip, not a banner. */
export function AnnouncementBar() {
  return (
    <div className="border-b border-border bg-background">
      <div className="shell flex min-h-[34px] items-center justify-between gap-4 font-mono text-micro uppercase text-muted">
        <p className="truncate">
          Pune, Maharashtra · Photographers welcome · Beginners welcome
        </p>
        <a
          href="#next-walk"
          className="whitespace-nowrap text-foreground transition-colors hover:text-accent"
        >
          Join the next walk →
        </a>
      </div>
    </div>
  );
}
