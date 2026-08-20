import { site } from '@/data/site';

export function SiteFooter() {
  const find = [
    { label: 'Instagram', href: site.links.instagram, external: true },
    { label: 'WhatsApp', href: site.links.whatsapp, external: true },
    { label: site.links.emailAddress, href: site.links.email, external: false },
  ];

  const smallPrint = [
    { label: 'Newsletter', href: '/#newsletter' },
    { label: 'Privacy', href: '/privacy' },
    { label: 'Terms', href: '/terms' },
  ];

  return (
    <footer className="border-t border-foreground py-section-sm">
      <div className="shell grid gap-[clamp(2rem,4vw,3rem)] md:grid-cols-[5fr_3fr_3fr]">
        <div>
          <p className="inline-flex items-center gap-2.5 text-[0.9375rem] font-medium tracking-tight">
            <span
              aria-hidden="true"
              className="grid h-[22px] w-[22px] flex-none place-items-center rounded-full border border-foreground"
            >
              <span className="h-[7px] w-[7px] rounded-full bg-accent" />
            </span>
            {site.name}
          </p>
          <p className="mt-4 max-w-[28ch] font-display text-lead text-foreground-soft">
            A community for people who like to walk with a camera.
          </p>
        </div>

        <nav aria-label="Find us">
          <p className="meta mb-4">Find us</p>
          <ul className="grid gap-2.5">
            {find.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  className="font-mono text-meta uppercase text-foreground-soft transition-colors hover:text-accent"
                  {...(item.external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-label="Small print">
          <p className="meta mb-4">Small print</p>
          <ul className="grid gap-2.5">
            {smallPrint.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  className="font-mono text-meta uppercase text-foreground-soft transition-colors hover:text-accent"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="shell mt-[clamp(2.5rem,5vw,4rem)]">
        <hr className="rule" />
        {/* The two halves of the bottom line sit apart on a wide screen and
            stack on a phone, rather than one long sentence that wraps badly. */}
        <div className="mt-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <p className="meta">
            © {site.established} {site.displayName} · Made in {site.city}
          </p>
          <p className="meta">
            Built by{' '}
            <a
              href={site.builtBy.url}
              target="_blank"
              rel="noreferrer noopener"
              className="text-foreground-soft underline decoration-border underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
            >
              {site.builtBy.name}
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
