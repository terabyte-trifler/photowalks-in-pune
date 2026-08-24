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
  /** Null where the photographer has not given one. */
  instagram: string | null;
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
  { id: 'p-hariharan', name: 'Hariharan Kalagudi',
    instagram: null, avatar: null, bio: null },
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

/* ----------------------------------------------------------------------------
 * THE ARCHIVE, AS A STACK
 * ----------------------------------------------------------------------------
 * Push, don't insert. Rows below are in the order they were added — oldest
 * first — so adding a photograph means appending to the end, which is the
 * natural thing to do and the thing anybody will do without being told.
 *
 * The grid wants the opposite: newest on top, because the twelve frames it
 * opens on should be what members have just put up rather than the oldest
 * thing here. So the display order is popped off the end.
 *
 * The previous version kept the array in display order with a comment asking
 * for new rows to go at the TOP. That is a convention a comment cannot
 * enforce, and appending — the obvious move — silently buried new work behind
 * two "load more" presses. Making it a stack means the ordering holds whether
 * or not anybody reads this.
 * ========================================================================== */
const photoStack: Photo[] = [
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

  /* --------------------------------------------------------------------
     Added so every category has something in it. The eight categories were
     written before there were any photographs; four of them had none, which
     made the filter offer choices that led nowhere.
     -------------------------------------------------------------------- */
  { id: 'photo-10', image: '/images/gallery/photo-10.jpg', photographerId: 'p-baguette',
    location: 'Pune', event: 'From the community archive',
    category: 'old-city', aspect: 'landscape',
    alt: 'Old Pune buildings with green shutters, motorbikes parked below and a man riding past' },
  { id: 'photo-11', image: '/images/gallery/photo-11.jpg', photographerId: 'p-baguette',
    location: 'Pune', event: 'From the community archive',
    category: 'old-city', aspect: 'portrait',
    alt: 'A shopfront with a man sitting outside it, scooters lined along the kerb' },
  { id: 'photo-12', image: '/images/gallery/photo-12.jpg', photographerId: 'p-baguette',
    location: 'Pune', event: 'From the community archive',
    category: 'old-city', aspect: 'landscape',
    alt: 'A small shop lit from within, a child standing in the doorway beside stacked stools' },
  { id: 'photo-13', image: '/images/gallery/photo-13.jpg', photographerId: 'p-ankush',
    location: 'Pune', event: 'From the community archive',
    category: 'markets', aspect: 'landscape',
    alt: 'A flower seller reaching across trays of marigolds and roses' },
  { id: 'photo-14', image: '/images/gallery/photo-14.jpg', photographerId: 'p-ankush',
    location: 'Pune', event: 'From the community archive',
    category: 'markets', aspect: 'landscape',
    alt: 'Silver jewellery hanging in rows at a market stall' },
  { id: 'photo-15', image: '/images/gallery/photo-15.jpg', photographerId: 'p-baguette',
    location: 'Pune', event: 'From the community archive',
    category: 'markets', aspect: 'landscape',
    alt: 'Marigold garlands strung above a market stall with betel leaves below' },
  { id: 'photo-16', image: '/images/gallery/photo-16.jpg', photographerId: 'p-ankush',
    location: 'Pune', event: 'From the community archive',
    category: 'markets', aspect: 'landscape',
    alt: 'A market lane lined with sacks of produce, a man walking through it' },
  { id: 'photo-17', image: '/images/gallery/photo-17.jpg', photographerId: 'p-baguette',
    location: 'Pune', event: 'From the community archive',
    category: 'street', aspect: 'portrait',
    alt: 'An autorickshaw passing a shopfront, the street busy behind' },
  { id: 'photo-18', image: '/images/gallery/photo-18.jpg', photographerId: 'p-gurnoor',
    location: 'Pune', event: 'From the community archive',
    category: 'street', aspect: 'landscape',
    alt: 'A motorcycle blurred past a Ganpati banner, in black and white' },
  { id: 'photo-19', image: '/images/gallery/photo-19.jpg', photographerId: 'p-gurnoor',
    location: 'Pune', event: 'From the community archive',
    category: 'street', aspect: 'portrait',
    alt: 'A large painted face on a weathered wall, its plaster flaking' },
  { id: 'photo-20', image: '/images/gallery/photo-20.jpg', photographerId: 'p-baguette',
    location: 'Pune', event: 'From the community archive',
    category: 'architecture', aspect: 'portrait',
    alt: 'A curved old building with rounded windows against a teal sky' },
  { id: 'photo-21', image: '/images/gallery/photo-21.jpg', photographerId: 'p-aditya',
    location: 'Pune', event: 'From the community archive',
    category: 'architecture', aspect: 'portrait',
    alt: 'A carved stone column at a temple, a garlanded figure behind it' },
  { id: 'photo-22', image: '/images/gallery/photo-22.jpg', photographerId: 'p-baguette',
    location: 'Pune', event: 'From the community archive',
    category: 'architecture', aspect: 'portrait',
    alt: 'A folding metal shutter drawn across a shopfront, in black and white' },
  { id: 'photo-23', image: '/images/gallery/photo-23.jpg', photographerId: 'p-sutirth',
    location: 'Pune', event: 'From the community archive',
    category: 'monsoon', aspect: 'portrait',
    alt: 'Curry leaves holding beads of rain after a monsoon shower' },
  { id: 'photo-24', image: '/images/gallery/photo-24.jpg', photographerId: 'p-ankush',
    location: 'Pune', event: 'From the community archive',
    category: 'people', aspect: 'portrait',
    alt: 'A woman leaning out of a first-floor window, in black and white' },
  { id: 'photo-25', image: '/images/gallery/photo-25.jpg', photographerId: 'p-gurnoor',
    location: 'Pune', event: 'From the community archive',
    category: 'people', aspect: 'portrait',
    alt: 'An elderly couple walking in a procession, one carrying a stringed instrument' },
  { id: 'photo-26', image: '/images/gallery/photo-26.jpg', photographerId: 'p-ankush',
    location: 'Pune', event: 'From the community archive',
    category: 'people', aspect: 'landscape',
    alt: 'A close portrait of a man in a cap, in black and white' },
  { id: 'photo-27', image: '/images/gallery/photo-27.jpg', photographerId: 'p-ankush',
    location: 'Pune', event: 'From the community archive',
    category: 'people', aspect: 'landscape',
    alt: 'A man in a market raising his thumb towards the camera' },
  { id: 'photo-28', image: '/images/gallery/photo-28.jpg', photographerId: 'p-gurnoor',
    location: 'Pune', event: 'From the community archive',
    category: 'night', aspect: 'portrait',
    alt: 'A Ganpati pandal lit up at night, the idol framed in gold' },
  { id: 'photo-29', image: '/images/gallery/photo-29.jpg', photographerId: 'p-gurnoor',
    location: 'Pune', event: 'From the community archive',
    category: 'night', aspect: 'portrait',
    alt: 'The moon, half lit, against a black sky' },
  { id: 'photo-30', image: '/images/gallery/photo-30.jpg', photographerId: 'p-naman',
    location: 'Pune', event: 'From the community archive',
    category: 'night', aspect: 'landscape',
    alt: 'A gas flame burning blue in a dark kitchen' },
  { id: 'photo-31', image: '/images/gallery/photo-31.jpg', photographerId: 'p-baguette',
    location: 'Pune', event: 'From the community archive',
    category: 'nature', aspect: 'portrait',
    alt: 'Hills and trees receding into haze above a valley' },
  { id: 'photo-32', image: '/images/gallery/photo-32.jpg', photographerId: 'p-gurnoor',
    location: 'Pune', event: 'From the community archive',
    category: 'nature', aspect: 'landscape',
    alt: 'A langur sitting on a post at the edge of the trees' },
  { id: 'photo-33', image: '/images/gallery/photo-33.jpg', photographerId: 'p-gurnoor',
    location: 'Pune', event: 'From the community archive',
    category: 'nature', aspect: 'landscape',
    alt: 'Two monkeys grooming each other in low light' },

  /* Added in a later pass, appended as new work always is. */
  { id: 'photo-34', image: '/images/gallery/photo-34.jpg', photographerId: 'p-aditya',
    location: 'Pune', event: 'From the community archive',
    category: 'people', aspect: 'portrait',
    alt: 'A woman in a patterned sari sitting on the steps by the water at sunrise, a long arcade of arches behind her' },
  { id: 'photo-35', image: '/images/gallery/photo-35.jpg', photographerId: 'p-ankush',
    location: 'Pune', event: 'From the community archive',
    category: 'people', aspect: 'landscape',
    alt: 'A man in camouflage uniform standing in a market lane, looking straight at the camera' },
  { id: 'photo-36', image: '/images/gallery/photo-36.jpg', photographerId: 'p-ankush',
    location: 'Pune', event: 'From the community archive',
    category: 'people', aspect: 'landscape',
    alt: 'A man in glasses framed behind a wire mesh window, in black and white' },
  { id: 'photo-37', image: '/images/gallery/photo-37.jpg', photographerId: 'p-ankush',
    location: 'Pune', event: 'From the community archive',
    category: 'people', aspect: 'portrait',
    alt: 'A man bent low over the handlebars of his scooter, in black and white' },
  { id: 'photo-38', image: '/images/gallery/photo-38.jpg', photographerId: 'p-baguette',
    location: 'Pune', event: 'From the community archive',
    category: 'people', aspect: 'portrait',
    alt: 'A woman in a yellow headscarf and dark sunglasses, layered necklaces at her throat' },
  { id: 'photo-39', image: '/images/gallery/photo-39.jpg', photographerId: 'p-gurnoor',
    location: 'Pune', event: 'From the community archive',
    category: 'people', aspect: 'portrait',
    alt: 'A drummer in white playing at a procession, saffron flags and a crowd of raised phones behind him' },
  { id: 'photo-40', image: '/images/gallery/photo-40.jpg', photographerId: 'p-naman',
    location: 'Pune', event: 'From the community archive',
    category: 'people', aspect: 'landscape',
    alt: 'Someone holding up a phone to photograph a decorated pandal, seen from behind' },
  { id: 'photo-41', image: '/images/gallery/photo-41.jpg', photographerId: 'p-ankush',
    location: 'Pune', event: 'From the community archive',
    category: 'street', aspect: 'landscape',
    alt: 'People walking past shopfronts on a narrow street, a man resting on a railing in the foreground, in black and white' },
  { id: 'photo-42', image: '/images/gallery/photo-42.jpg', photographerId: 'p-baguette',
    location: 'Pune', event: 'From the community archive',
    category: 'street', aspect: 'portrait',
    alt: 'A street at sunrise seen over rows of parked motorcycles, figures moving through the low light' },
  { id: 'photo-43', image: '/images/gallery/photo-43.jpg', photographerId: 'p-baguette',
    location: 'Pune', event: 'From the community archive',
    category: 'street', aspect: 'landscape',
    alt: 'A young man sitting on a step with a carrier bag, against a wall of peeling red and blue paint' },
  { id: 'photo-44', image: '/images/gallery/photo-44.jpg', photographerId: 'p-baguette',
    location: 'Pune', event: 'From the community archive',
    category: 'street', aspect: 'landscape',
    alt: 'Passengers seated inside a bus, afternoon light coming through the windows' },
  { id: 'photo-45', image: '/images/gallery/photo-45.jpg', photographerId: 'p-naman',
    location: 'Pune', event: 'From the community archive',
    category: 'street', aspect: 'landscape',
    alt: 'An old bicycle and a scooter parked against a rough stone wall, in black and white' },
  { id: 'photo-46', image: '/images/gallery/photo-46.jpg', photographerId: 'p-baguette',
    location: 'Pune', event: 'From the community archive',
    category: 'street', aspect: 'portrait',
    alt: 'Morning sun coming through a large tree over a street of autorickshaws and traffic lights' },
  { id: 'photo-47', image: '/images/gallery/photo-47.jpg', photographerId: 'p-ankush',
    location: 'Pune', event: 'From the community archive',
    category: 'old-city', aspect: 'landscape',
    alt: 'A busy street running towards a temple spire, traffic and overhead wires, in black and white' },
  { id: 'photo-48', image: '/images/gallery/photo-48.jpg', photographerId: 'p-baguette',
    location: 'Pune', event: 'From the community archive',
    category: 'old-city', aspect: 'landscape',
    alt: 'The corner of an old building with painted Marathi signboards and a shuttered shopfront below' },
  { id: 'photo-49', image: '/images/gallery/photo-49.jpg', photographerId: 'p-ankush',
    location: 'Pune', event: 'From the community archive',
    category: 'old-city', aspect: 'landscape',
    alt: 'An old scooter parked behind railings beside a weathered wall, in black and white' },
  { id: 'photo-50', image: '/images/gallery/photo-50.jpg', photographerId: 'p-naman',
    location: 'Pune', event: 'From the community archive',
    category: 'old-city', aspect: 'landscape',
    alt: 'A decorated Ganpati pandal hung with garlands, a crowd seated in front of it, in black and white' },
  { id: 'photo-51', image: '/images/gallery/photo-51.jpg', photographerId: 'p-ankush',
    location: 'Pune', event: 'From the community archive',
    category: 'markets', aspect: 'landscape',
    alt: 'A man standing beside his autorickshaw in a market lane, stalls and produce behind him' },
  { id: 'photo-52', image: '/images/gallery/photo-52.jpg', photographerId: 'p-ankush',
    location: 'Pune', event: 'From the community archive',
    category: 'markets', aspect: 'landscape',
    alt: 'A crowded market under an orange canopy, shoppers walking between stalls laid out with flowers' },
  { id: 'photo-53', image: '/images/gallery/photo-53.jpg', photographerId: 'p-aditya',
    location: 'Pune', event: 'From the community archive',
    category: 'architecture', aspect: 'portrait',
    alt: 'A dark corridor in an old building leading to a lit staircase at the far end' },
  { id: 'photo-54', image: '/images/gallery/photo-54.jpg', photographerId: 'p-baguette',
    location: 'Pune', event: 'From the community archive',
    category: 'architecture', aspect: 'portrait',
    alt: 'A man sitting behind a folding metal gate, its lattice filling the frame, in black and white' },
  { id: 'photo-55', image: '/images/gallery/photo-55.jpg', photographerId: 'p-gurnoor',
    location: 'Pune', event: 'From the community archive',
    category: 'architecture', aspect: 'landscape',
    alt: 'A painted wall of many faces crowded together, portraits in bright colour' },
  { id: 'photo-56', image: '/images/gallery/photo-56.jpg', photographerId: 'p-hariharan',
    location: 'Pune', event: 'From the community archive',
    category: 'monsoon', aspect: 'portrait',
    alt: 'People running across a wet road in the rain, buses waiting at a stand behind them' },
  { id: 'photo-57', image: '/images/gallery/photo-57.jpg', photographerId: 'p-hariharan',
    location: 'Pune', event: 'From the community archive',
    category: 'night', aspect: 'portrait',
    alt: 'A drummer in a crowd lit red at night, smoke and raised arms around him' },
  { id: 'photo-58', image: '/images/gallery/photo-58.jpg', photographerId: 'p-hariharan',
    location: 'Pune', event: 'From the community archive',
    category: 'nature', aspect: 'portrait',
    alt: 'Looking straight up the trunk of a bare tree into a night sky with the moon behind its branches' },

];

/** Newest first. A copy, so the stack itself is never reversed in place. */
export const photos: Photo[] = [...photoStack].reverse();


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
