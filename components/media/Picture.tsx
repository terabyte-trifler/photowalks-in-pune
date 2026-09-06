import NextImage from 'next/image';
import type { CSSProperties } from 'react';

import variants from '@/data/image-variants.json';
import { IMAGE_QUALITY, uploadSrcSet } from '@/lib/images';

/* ============================================================================
 * PICTURE — one component, two very different ways of being served
 * ----------------------------------------------------------------------------
 * Call sites here render a mix that cannot be separated by inspection. The
 * lightbox opens both an archive photograph from /public and a member's upload
 * from Supabase Storage; the Instagram strip shows local placeholders until a
 * token is configured and remote media afterwards. So the decision is made per
 * src, at render, rather than by asking every caller to know:
 *
 *   in the manifest   ->  <picture> over files built by images:variants.
 *                         Plain static assets. The optimiser is never invoked,
 *                         so these cost no transformations at all, ever.
 *
 *   an upload with a   ->  <img srcset> over the rungs the browser produced
 *   variant marker         when it uploaded. Also no optimiser. One format,
 *                          because the uploader encodes one — whichever of
 *                          WebP or JPEG that browser could write.
 *
 *   anything else     ->  next/image, exactly as before. Google avatars,
 *                         Instagram media, and uploads from before the ladder
 *                         existed all land here.
 *
 * The <picture> path is not a downgrade. It emits a real srcset with the same
 * widths the optimiser would have produced, and it offers AVIF before WebP —
 * which is what next/image was negotiating per request. The difference is only
 * that the answer was computed at build time and committed.
 *
 * Aspect ratio comes from the manifest, so a static photograph reserves its box
 * before it loads without every caller passing width and height.
 * ========================================================================== */

type Manifest = Record<string, { w: number; h: number; widths: number[]; v: string }>;
const MANIFEST = variants as Manifest;

export interface PictureProps {
  src: string;
  alt: string;
  sizes?: string;
  className?: string;
  style?: CSSProperties;
  /** Fills a positioned parent, as next/image's own `fill` does. */
  fill?: boolean;
  width?: number;
  height?: number;
  priority?: boolean;
  loading?: 'lazy' | 'eager';
  'aria-hidden'?: 'true' | 'false';
}

/**
 * `/images/gallery/photo-01.jpg` -> `/images/_v/gallery/photo-01-<hash>`
 *
 * The hash is the source's, from the manifest, and it is what lets these be
 * served immutable for a year — replacing a photograph changes every derived
 * URL. See the headers rule for /images/_v in next.config.ts.
 *
 * Kept in step with the naming in scripts/build-image-variants.mjs by hand.
 * There is no shared constant because the script is ESM run by node and this
 * is bundled by Next; a module they both import would have to be plain JS with
 * no types, and the convention is one line in each place.
 */
function variantBase(src: string, hash: string): string {
  const withoutExtension = src.replace(/\.[^./]+$/, '');
  return `${withoutExtension.replace('/images/', '/images/_v/')}-${hash}`;
}

const srcSetFor = (base: string, widths: number[], ext: string): string =>
  widths.map((w) => `${base}-${w}.${ext} ${w}w`).join(', ');

export function Picture({
  src,
  alt,
  sizes,
  className,
  style,
  fill = false,
  width,
  height,
  priority = false,
  loading,
  ...rest
}: PictureProps) {
  const entry = MANIFEST[src];

  /* An upload that carries its ladder in its name. Nothing to negotiate: the
     widths are known from the name and the files are already there. */
  const uploaded = entry ? null : uploadSrcSet(src);
  if (uploaded) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        srcSet={uploaded}
        alt={alt}
        sizes={sizes}
        className={className}
        style={{
          ...(fill ? { position: 'absolute' as const, inset: 0, width: '100%', height: '100%' } : {}),
          ...style,
        }}
        width={width}
        height={height}
        decoding="async"
        loading={loading ?? (priority ? 'eager' : 'lazy')}
        fetchPriority={priority ? 'high' : undefined}
        {...rest}
      />
    );
  }

  /* Remote, or a local file that has not been through images:variants. */
  if (!entry) {
    return (
      <NextImage
        src={src}
        alt={alt}
        sizes={sizes}
        className={className}
        style={style}
        quality={IMAGE_QUALITY}
        priority={priority}
        loading={loading}
        {...(fill ? { fill: true } : { width: width ?? 1200, height: height ?? 800 })}
        {...rest}
      />
    );
  }

  const base = variantBase(src, entry.v);

  /* `fill` is next/image's contract, not the platform's: an absolutely
     positioned box inside a positioned parent. Reproduced here rather than
     asking the fifteen call sites to change how they lay images out. */
  const fillStyle: CSSProperties | undefined = fill
    ? { position: 'absolute', inset: 0, width: '100%', height: '100%' }
    : undefined;

  return (
    /* display:contents so the wrapper is invisible to the parent's layout —
       a grid or flex parent must keep seeing the image, not a <picture> box. */
    <picture style={{ display: 'contents' }}>
      <source type="image/avif" srcSet={srcSetFor(base, entry.widths, 'avif')} sizes={sizes} />
      <source type="image/webp" srcSet={srcSetFor(base, entry.widths, 'webp')} sizes={sizes} />
      <img
        src={src}
        alt={alt}
        sizes={sizes}
        className={className}
        style={{ ...fillStyle, ...style }}
        /* Intrinsic dimensions even under `fill`: they set the aspect ratio the
           browser reserves before any byte arrives, and the fill styles above
           override the used width and height anyway. */
        width={width ?? entry.w}
        height={height ?? entry.h}
        decoding="async"
        loading={loading ?? (priority ? 'eager' : 'lazy')}
        fetchPriority={priority ? 'high' : undefined}
        {...rest}
      />
    </picture>
  );
}

export default Picture;
