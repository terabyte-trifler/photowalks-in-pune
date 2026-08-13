import Link from 'next/link';

/** The only other route. There is one page, and this points back to it. */
export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-gutter">
      <div className="max-w-[40ch]">
        <p className="meta">404</p>
        <h1 className="display mt-4 text-display-lg">Nothing here.</h1>
        <p className="mt-4 font-display text-lead text-foreground-soft">
          The walk is back on the homepage.
        </p>
        <div className="mt-8">
          <Link href="/" className="cta">
            Back to Photowalks in Pune <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
