/* ============================================================================
 * PHOTOGRAPHS
 * ----------------------------------------------------------------------------
 * These are members' own photographs, taken from their profiles on this site.
 * The terms they agreed to grant display here — "on your profile and in the
 * community pages" — and every one carries its photographer's name and their
 * Instagram, because a credit is the least this can do in exchange.
 *
 * `location` says Pune and nothing more precise. Uploads do not record where a
 * frame was made, and the placeholders this replaced named specific streets —
 * Tulshibaug, Laxmi Road, Shaniwar Wada. Carrying those over would have
 * attached a claim to somebody's real work that nobody had made. If a
 * photographer tells you where one was taken, put it in then.
 *
 * `event` is left as the general archive for the same reason: which walk a
 * photograph came from is not recorded either.
 *
 * The alt text describes what is actually in each frame, written from looking
 * at them.
 * ========================================================================== */

export type PhotoCategory =
  | 'old-city' | 'markets' | 'street' | 'architecture'
  | 'monsoon' | 'people' | 'night' | 'nature';

export interface Photographer {
  id: string;
  name: string;
  instagram: string;
  avatar: string | null;
  /** Null where we have not been given one. Nothing here is invented. */
  bio: string | null;
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
  { id: 'p-baguette', name: 'Baguette',
    instagram: 'https://instagram.com/framesbybaguette', avatar: null, bio: null },
  { id: 'p-gurnoor', name: 'Gurnoor Singh',
    instagram: 'https://instagram.com/terabyte_trifler', avatar: null, bio: null },
  { id: 'p-ankush', name: 'Ankush Gupta',
    instagram: 'https://instagram.com/cine.ankush', avatar: null, bio: null },
  { id: 'p-aditya', name: 'Aditya Rohanekar',
    instagram: 'https://instagram.com/kalakar_pardyamagcha', avatar: null, bio: null },
  { id: 'p-naman', name: 'Naman Gupta',
    instagram: 'https://instagram.com/dr.tasveer', avatar: null, bio: null },
  { id: 'p-sutirth', name: 'Sutirth',
    instagram: 'https://instagram.com/sutirth.jpg', avatar: null, bio: null },
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
  { id: 'photo-01', image: '/images/gallery/photo-01.jpg', photographerId: 'p-baguette',
    location: 'Pune', event: 'From the community archive',
    category: 'street', aspect: 'landscape',
    alt: 'Two men in a narrow Pune lane, one walking towards the camera and one standing with his arms folded, in black and white' },
  { id: 'photo-02', image: '/images/gallery/photo-02.jpg', photographerId: 'p-naman',
    location: 'Pune', event: 'From the community archive',
    category: 'people', aspect: 'landscape',
    alt: 'Someone in a white cap holding up a phone to photograph a decorated Ganpati pandal, autorickshaws waiting behind' },
  { id: 'photo-03', image: '/images/gallery/photo-03.jpg', photographerId: 'p-gurnoor',
    location: 'Pune', event: 'From the community archive',
    category: 'architecture', aspect: 'portrait',
    alt: 'A weathered yellow wooden door in an old Pune wada, its paint flaking and its panels lit from the side' },
  { id: 'photo-04', image: '/images/gallery/photo-04.jpg', photographerId: 'p-baguette',
    location: 'Pune', event: 'From the community archive',
    category: 'people', aspect: 'portrait',
    alt: 'A woman in a bright green shawl and dark glasses, arms crossed, against a teal shop shutter' },
  { id: 'photo-05', image: '/images/gallery/photo-05.jpg', photographerId: 'p-gurnoor',
    location: 'Pune', event: 'From the community archive',
    category: 'street', aspect: 'portrait',
    alt: 'A disused BSNL STD and ISD telephone booth in black and white, wedged against a stone wall' },
  { id: 'photo-06', image: '/images/gallery/photo-06.jpg', photographerId: 'p-baguette',
    location: 'Pune', event: 'From the community archive',
    category: 'old-city', aspect: 'landscape',
    alt: 'A chai stall at work in black and white, the menu boards overhead listing paratha, vada and samosa' },
  { id: 'photo-07', image: '/images/gallery/photo-07.jpg', photographerId: 'p-ankush',
    location: 'Pune', event: 'From the community archive',
    category: 'street', aspect: 'landscape',
    alt: 'A cyclist crossing an empty road, colour drained from everything but the rider and a passing autorickshaw' },
  { id: 'photo-08', image: '/images/gallery/photo-08.jpg', photographerId: 'p-aditya',
    location: 'Pune', event: 'From the community archive',
    category: 'architecture', aspect: 'portrait',
    alt: 'An ornate temple facade in blue and gold, lit and layered with carved figures' },
  { id: 'photo-09', image: '/images/gallery/photo-09.jpg', photographerId: 'p-gurnoor',
    location: 'Pune', event: 'From the community archive',
    category: 'people', aspect: 'portrait',
    alt: 'A dhol player in a white cap and orange scarf mid-beat during a procession, the crowd close around him' },
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
  imageAlt:
    'Early light coming through trees over a quiet Pune street, a traffic signal still red and almost nothing moving',
  standfirst:
    'There is another Pune before the shops open, before the traffic builds and before the streets fill with noise.',
  body: [
    'We meet at Kasba at ten to seven. It is still cool. The chai stall is open and almost nothing else is. For about forty minutes the old city belongs to milkmen, sweepers, one cat, and us.',
    'Nobody hurries. That is the whole method. You walk a hundred metres, you stop, you wait for the light to move down a wall, and you make one frame instead of forty.',
    'By half past eight the shutters are up and Laxmi Road is Laxmi Road again. We end at a tea shop and look at each other’s screens, which is the actual point of the morning.',
  ],
  photographerId: 'p-baguette',
};
