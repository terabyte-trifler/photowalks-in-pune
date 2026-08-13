import { SectionHeader } from '@/components/ui/Typography';
import { GalleryFilter } from './GalleryFilter';
import { PhotoGrid } from './PhotoGrid';

/** Server component; the filter, grid and lightbox below it are client. */
export function PhotoGallery() {
  return (
    <section id="gallery" className="border-t border-border py-section" aria-labelledby="gallery-title">
      <div className="shell">
        <SectionHeader index="05" label="From the walks" />

        <div className="mb-[clamp(2rem,4vw,3rem)]">
          <h2 id="gallery-title" className="display text-display-xl">
            From the walks
          </h2>
          <p className="mt-4 font-display text-lead text-foreground-soft">
            Photographs made by the community.
          </p>
        </div>

        <GalleryFilter />
        <PhotoGrid />
      </div>
    </section>
  );
}
