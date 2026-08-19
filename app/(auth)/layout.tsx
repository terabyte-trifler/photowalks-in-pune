import type { Metadata } from 'next';
import type { ReactNode } from 'react';

/**
 * The account screens. `full-bleed` tells globals.css to give back the
 * contact-sheet gutter, because the rail is not rendered beside these pages.
 *
 * Nothing here is worth indexing, and a login page in search results is a
 * small phishing surface, so the whole group is noindex.
 */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="full-bleed">{children}</div>;
}
