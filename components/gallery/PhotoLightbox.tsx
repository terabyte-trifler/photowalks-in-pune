'use client';

import { useGallery } from './GalleryProvider';
import { LightboxFrame } from './LightboxFrame';

/** The archive's viewer: LightboxFrame, fed from the gallery context. */
export function PhotoLightbox() {
  const { visible, lightboxIndex, closeLightbox, step, creditFor } = useGallery();
  const photo = lightboxIndex === null ? null : visible[lightboxIndex];

  return (
    <LightboxFrame
      open={lightboxIndex !== null}
      index={lightboxIndex}
      count={visible.length}
      src={photo?.image ?? null}
      alt={photo?.alt ?? ''}
      footer={
        photo ? (
          <>
            {creditFor(photo.photographerId) ?? 'Uncredited'} · {photo.location}
            <br />
            {photo.event}
          </>
        ) : null
      }
      onClose={closeLightbox}
      onStep={step}
    />
  );
}
