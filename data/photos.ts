/* ============================================================================
 * PHOTOGRAPHS
 * ----------------------------------------------------------------------------
 * `photographer` is null until a real community photograph with a real credit
 * replaces the placeholder. No credit has been invented; null renders as
 * UNCREDITED. Add people to `photographers` first, then reference the id.
 * ========================================================================== */

export type PhotoCategory =
  | 'old-city' | 'markets' | 'street' | 'architecture'
  | 'monsoon' | 'people' | 'night' | 'nature';

export interface Photographer {
  id: string;
  name: string;
  instagram: string;
  avatar: string | null;
  bio: string;
}

export interface Photo {
  id: string;
  image: string;
  alt: string;
  /** Photographer id, or null while this is a placeholder. */
  photographerId: string | null;
  location: string;
  /** Which walk it was made on. */
  event: string;
  category: PhotoCategory;
  aspect: 'portrait' | 'landscape' | 'square';
}

export const photographers: Photographer[] = [
  // Deliberately empty. Add real community members here:
  // { id: 'p-01', name: '...', instagram: 'https://instagram.com/...',
  //   avatar: null, bio: '...' },
];

export const getPhotographerName = (id: string | null): string | null =>
  id ? (photographers.find((p) => p.id === id)?.name ?? null) : null;

export const categories: { id: PhotoCategory; label: string; note: string }[] = [
  { id: 'old-city',     label: 'Old City',     note: 'Peths, wadas, doorways' },
  { id: 'markets',      label: 'Markets',      note: 'Mandai, Tulshibaug' },
  { id: 'street',       label: 'Street Life',  note: 'Whatever happens next' },
  { id: 'architecture', label: 'Architecture', note: 'Stone, iron, concrete' },
  { id: 'monsoon',      label: 'Monsoon',      note: 'June to September' },
  { id: 'people',       label: 'People',       note: 'Asked, not taken' },
  { id: 'night',        label: 'Night',        note: 'After the shops close' },
  { id: 'nature',       label: 'Nature',       note: 'River, hills, trees' },
];

export const photos: Photo[] = [
  { id: 'photo-01', image: '/images/gallery/photo-01.jpg', photographerId: null,
    location: 'Tulshibaug', event: 'Old Pune / Morning Stories',
    category: 'old-city', aspect: 'portrait',
    alt: 'Placeholder for a photograph made in Tulshibaug, old Pune' },
  { id: 'photo-02', image: '/images/gallery/photo-02.jpg', photographerId: null,
    location: 'Mahatma Phule Mandai', event: 'Market / People of Mandai',
    category: 'markets', aspect: 'landscape',
    alt: 'Placeholder for a photograph made in Mahatma Phule Mandai, Pune' },
  { id: 'photo-03', image: '/images/gallery/photo-03.jpg', photographerId: null,
    location: 'Laxmi Road', event: 'Old Pune / Morning Stories',
    category: 'street', aspect: 'square',
    alt: 'Placeholder for a street photograph made on Laxmi Road, Pune' },
  { id: 'photo-04', image: '/images/gallery/photo-04.jpg', photographerId: null,
    location: 'Shaniwar Wada', event: 'Old Pune / Morning Stories',
    category: 'architecture', aspect: 'portrait',
    alt: 'Placeholder for a photograph of heritage architecture at Shaniwar Wada, Pune' },
  { id: 'photo-05', image: '/images/gallery/photo-05.jpg', photographerId: null,
    location: 'FC Road', event: 'Monsoon / City After Rain',
    category: 'monsoon', aspect: 'landscape',
    alt: 'Placeholder for a monsoon photograph made on FC Road, Pune' },
  { id: 'photo-06', image: '/images/gallery/photo-06.jpg', photographerId: null,
    location: 'Kasba Peth', event: 'Market / People of Mandai',
    category: 'people', aspect: 'square',
    alt: 'Placeholder for a portrait made in Kasba Peth, Pune' },
  { id: 'photo-07', image: '/images/gallery/photo-07.jpg', photographerId: null,
    location: 'Deccan', event: 'Monsoon / City After Rain',
    category: 'night', aspect: 'landscape',
    alt: 'Placeholder for a night photograph made in Deccan, Pune' },
  { id: 'photo-08', image: '/images/gallery/photo-08.jpg', photographerId: null,
    location: 'Mula-Mutha', event: 'River / Light & Reflection',
    category: 'nature', aspect: 'portrait',
    alt: 'Placeholder for a photograph made along the Mula-Mutha river, Pune' },
  { id: 'photo-09', image: '/images/gallery/photo-09.jpg', photographerId: null,
    location: 'Bhide Wada', event: 'Old Pune / Morning Stories',
    category: 'architecture', aspect: 'square',
    alt: 'Placeholder for a photograph of a wada in old Pune' },
];

export interface Story {
  id: string;
  slug: string;
  label: string;
  title: string;
  image: string;
  imageAlt: string;
  standfirst: string;
  body: string[];
  photographerId: string | null;
}

export const featuredStory: Story = {
  id: 'story-01',
  slug: 'before-the-city-wakes',
  label: 'A photowalk in old Pune',
  title: 'Before the City Wakes',
  image: '/images/stories/before-the-city-wakes.jpg',
  imageAlt: 'Placeholder for a photograph of old Pune before the shops open',
  standfirst:
    'There is another Pune before the shops open, before the traffic builds and before the streets fill with noise.',
  body: [
    'We meet at Kasba at ten to seven. It is still cool. The chai stall is open and almost nothing else is. For about forty minutes the old city belongs to milkmen, sweepers, one cat, and us.',
    'Nobody hurries. That is the whole method. You walk a hundred metres, you stop, you wait for the light to move down a wall, and you make one frame instead of forty.',
    'By half past eight the shutters are up and Laxmi Road is Laxmi Road again. We end at a tea shop and look at each other’s screens, which is the actual point of the morning.',
  ],
  photographerId: null,
};
