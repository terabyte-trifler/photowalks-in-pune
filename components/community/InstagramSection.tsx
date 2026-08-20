import Image from 'next/image';
import { site } from '@/data/site';
import { getInstagramPosts, isInstagramConfigured } from '@/lib/instagram';
import { Reveal } from '@/components/ui/Reveal';
import { SectionHeader } from '@/components/ui/Typography';

/** Async server component — swaps to the Graph API without touching the markup. */
export async function InstagramSection() {
  const posts = await getInstagramPosts();

  return (
    <section id="instagram" className="border-t border-border py-section" aria-labelledby="instagram-title">
      <div className="shell">
        <SectionHeader index="10" label="From Instagram" />

        <div className="mb-[clamp(1.75rem,3vw,2.5rem)] flex flex-wrap items-end justify-between gap-4">
          <h2 id="instagram-title" className="display text-display-lg">
            From Instagram
          </h2>
          <a
            className="meta text-foreground transition-colors hover:text-accent"
            href={site.links.instagram}
            target="_blank"
            rel="noreferrer noopener"
          >
            {site.links.instagramHandle}
          </a>
        </div>

        <Reveal className="grid grid-cols-2 gap-[clamp(0.5rem,1.2vw,1rem)] md:grid-cols-6">
          {posts.map((post) => (
            <a
              key={post.id}
              href={post.permalink}
              target="_blank"
              rel="noreferrer noopener"
              className="group relative block overflow-hidden bg-subtle"
            >
              <Image
                src={post.image}
                alt={post.caption}
                width={900}
                height={900}
                quality={70}
                loading="lazy"
                sizes="(min-width: 768px) 17vw, 50vw"
                className="aspect-square w-full object-cover transition-[transform,opacity] duration-700 ease-editorial group-hover:scale-105 group-hover:opacity-75"
              />
              <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-[linear-gradient(to_top,rgba(10,9,8,0.75),transparent)] p-3 font-mono text-[0.5625rem] uppercase tracking-[0.14em] text-white opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                {post.caption}
              </span>
            </a>
          ))}
        </Reveal>

        <div className="mt-[clamp(1.75rem,3vw,2.5rem)]">
          <a className="cta" href={site.links.instagram} target="_blank" rel="noreferrer noopener">
            Follow the community <span aria-hidden="true">→</span>
          </a>
        </div>

        {!isInstagramConfigured() && (
          <p className="meta mt-5 normal-case tracking-[0.06em]">
            Placeholders — set INSTAGRAM_ACCESS_TOKEN and these become the six most
            recent posts from {site.links.instagramHandle}.
          </p>
        )}
      </div>
    </section>
  );
}
