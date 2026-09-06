/* ============================================================================
 * PLACES
 * ----------------------------------------------------------------------------
 * A walk is an event: it happens once, on a date, and afterwards its page is a
 * record. A place outlives every walk held there.
 *
 * That distinction was costing us. Three walks have been to Mandai and three to
 * FC Road, each with its own dated page and eleven words of description, all
 * competing with one another for the same search. Nobody arriving at
 * "mandai photowalk" wants the 20th of June specifically — they want to know
 * what it is like to photograph there and when the next one is.
 *
 * So a place page is the durable one. It gathers every walk held in that area,
 * every photograph made on those walks, and writing about the place that stays
 * true after the walk has been. The dated walk pages remain, and link up to it.
 *
 * THE JOIN
 * `area` is the key, and it is already on every Event. Nothing here duplicates
 * a walk: the walks are read from data/events.ts at render time, so adding a
 * walk in an existing area needs no edit to this file.
 *
 * ON THE COPY BELOW
 * This is a first draft written from public sources and general knowledge of
 * the city, and it is the weakest part of the feature. Every one of these
 * places has been walked by people in this community who know what the light
 * does there in August and which lane is worth the detour. Replace it with
 * that. Specific beats comprehensive, and firsthand beats both — a paragraph
 * from somebody who was there at 6am is worth more than anything generic.
 * ========================================================================== */

import { upcomingWalks, type Event } from './events';

export interface Place {
  /** URL segment: /places/<slug>. */
  slug: string;
  /** The full name, as it would be said aloud. */
  name: string;
  /** Short form for breadcrumbs and cards. */
  shortName: string;
  /** The join key. Must match Event.area exactly. */
  area: string;
  /** One sentence, used as the meta description and the page lead. */
  lead: string;
  /** The body, one string per paragraph. */
  body: string[];
  /** When the light is worth being there for. */
  bestLight: string;
  /** What there is to photograph. Rendered as a list. */
  subjects: string[];
  /** Getting there, in the way somebody local would say it. */
  gettingThere: string;
  /** Rendered on the page and emitted as FAQPage structured data. */
  faqs: { question: string; answer: string }[];
}

export const places: Place[] = [
  {
    slug: 'mandai',
    name: 'Mahatma Phule Mandai',
    shortName: 'Mandai',
    area: 'Mandai',
    lead: 'Pune’s central produce market, and the most photographed building in the old city — best an hour after it opens, when the light is still low and the floor is still wet.',
    body: [
      'The Mandai is a covered market from the late nineteenth century in Budhwar Peth, and its ironwork roof is the reason photographers keep returning: the light comes down through it in bands, moves through the morning, and puts a different part of the floor in the sun every twenty minutes.',
      'Arrive before eight. The produce comes in early, the aisles are wide enough to work in before the crowd, and the vendors are setting up rather than selling, which is a more generous moment to photograph than the middle of a transaction. By ten it is busy in a way that is harder to make a frame out of.',
      'The flower section is the one people miss. It is denser, lower and more colourful than the vegetable aisles, and it turns over faster — two of our walks have gone specifically for it.',
      'Ask before photographing a vendor close up. Most say yes, and the frame is better for the exchange.',
    ],
    bestLight: 'Between 6:30 and 8:30, while the sun is still coming through the roof at an angle.',
    subjects: [
      'Produce stacked at the stalls before the crowd arrives',
      'The ironwork roof and the light it throws down',
      'Flower sellers in the section off the main hall',
      'Vendors setting up, weighing, and waiting',
      'The building itself, from the street outside',
    ],
    gettingThere:
      'Budhwar Peth, a short walk from Shaniwarwada and Kasba Peth. Parking is difficult on market mornings; most people come by rickshaw or on foot from the Shaniwarwada side.',
    faqs: [
      {
        question: 'What time should I get to Mandai to photograph it?',
        answer:
          'Before eight. The market is at its most workable between 6:30 and 8:30, when the produce is arriving, the aisles are still passable and the light is coming through the roof at an angle. After ten it is crowded enough that working becomes difficult.',
      },
      {
        question: 'Is photography allowed inside the Mandai?',
        answer:
          'Yes, it is a public market and photographers are a common sight. Ask before photographing somebody close up, and do not block an aisle a vendor is trying to work in.',
      },
      {
        question: 'What camera do I need for a Mandai photowalk?',
        answer:
          'Whatever you have, a phone included. The light is low indoors early on, so something that handles higher ISO helps, and a wide-to-normal lens suits the aisles better than a long one.',
      },
    ],
  },
  {
    slug: 'kasba-peth',
    name: 'Kasba Peth',
    shortName: 'Kasba Peth',
    area: 'Kasba Peth',
    lead: 'The oldest part of Pune, and the one where people are still making things by hand in the lanes they have always made them in.',
    body: [
      'Kasba Peth is where the city started, and it is still organised the old way — by trade. Tambat Ali is the copper workers’ lane, Kumbhar Wada the potters’, and both are working streets rather than exhibits, which is exactly what makes them worth photographing.',
      'Tambat Ali is the one to plan around. The beating starts early and the sound carries, so you find it before you see it. The workshops are small, open to the lane, and lit from one side by the doorway — a difficult, rewarding light that rewards getting close and waiting.',
      'Around the trade lanes are the wadas: courtyard houses with deep doorways, carved frames and a lot of shade. The Kasba Ganpati temple anchors the area and is busiest early.',
      'This is a residential neighbourhood as much as a photographic one. Work quietly, and it will keep being a place people are glad to see photographers in.',
    ],
    bestLight:
      'Early morning, while the workshops are opening and the lanes are still in shade with the sky bright above.',
    subjects: [
      'Copper workers at the bench in Tambat Ali',
      'Potters’ wheels and drying racks in Kumbhar Wada',
      'Wada doorways, carved frames and courtyards',
      'The Kasba Ganpati temple in the morning',
      'Narrow lanes with one wall lit and the other dark',
    ],
    gettingThere:
      'North of Shaniwarwada, walkable from the Mandai. The lanes are too narrow to drive comfortably — leave the vehicle on the main road and walk in.',
    faqs: [
      {
        question: 'What is there to photograph in Kasba Peth?',
        answer:
          'It is organised by trade, so the subjects are people working: copper beaters in Tambat Ali, potters in Kumbhar Wada, and the wada houses and temples between them. It is the oldest part of Pune and still a working neighbourhood rather than a preserved one.',
      },
      {
        question: 'Can I photograph inside the workshops at Tambat Ali?',
        answer:
          'The workshops open onto the lane and photographers are not unusual there, but ask first. It is somebody’s workplace, and a nod before you raise the camera is the difference between being welcome and being tolerated.',
      },
    ],
  },
  {
    slug: 'fc-road',
    name: 'Fergusson College Road',
    shortName: 'FC Road',
    area: 'FC Road',
    lead: 'A student street that changes character three times a day — the easiest place in Pune to practise photographing strangers without being conspicuous.',
    body: [
      'FC Road is busy, commercial and used to being looked at, which makes it the least intimidating street in the city to work. Nobody minds a camera here, and there is enough happening that you can stand still and let frames arrive rather than hunting them.',
      'The evening is the reason to come. Shopfronts light up before the sky goes, and for about forty minutes there is a balance between the two that flatters everything — signage, glass, the crowd moving between them.',
      'It is a good street for constraints. One of our walks here went out looking only for shapes, which is a better instruction than "photograph FC Road" and produced work that looked nothing like the usual.',
      'Reflections are everywhere and mostly ignored: shop glass, parked mirrors, puddles in the monsoon.',
    ],
    bestLight:
      'The hour before dark, when the shopfronts are lit and there is still colour in the sky.',
    subjects: [
      'Shopfronts and signage after they light up',
      'Students and the evening crowd',
      'Reflections in shop glass and parked mirrors',
      'Layers — foreground, street, and lit background together',
      'Monsoon puddles and the light in them',
    ],
    gettingThere:
      'Runs from Fergusson College down to the Deccan end. Well served by buses and rickshaws, and easy to walk end to end in an hour.',
    faqs: [
      {
        question: 'Is FC Road good for beginner street photography?',
        answer:
          'It is the best place in Pune to start. It is busy, it is used to cameras, and nobody looks twice — so you can practise photographing strangers without the self-consciousness that makes beginners hesitate at the moment that matters.',
      },
      {
        question: 'What time is best for photographs on FC Road?',
        answer:
          'The hour before dark. The shopfronts come on while there is still light in the sky, and the two balance for around forty minutes.',
      },
    ],
  },
  {
    slug: 'camp',
    name: 'Pune Camp',
    shortName: 'Camp',
    area: 'Camp',
    lead: 'Colonial-era arcades, old bakeries and shopfronts that have not been redesigned in decades — a place to photograph buildings and the light under them.',
    body: [
      'Camp is the cantonment, and it is built differently from the peths: wider streets, deep arcades along the shopfronts, and a lot of architecture that has been left alone. The arcades are the photographic feature. They throw a hard edge of shade across the pavement, and people walk in and out of it all day.',
      'MG Road and the lanes off it hold the old bakeries and tailors. Signage here is worth a walk on its own — hand-painted, faded, and often older than the shop behind it.',
      'Late afternoon is when the arcades do the most. The sun gets low enough to reach under them, and the columns start throwing long shapes down the pavement.',
      'Pul Gate at the other end is busier and less tidy, which is a compliment.',
    ],
    bestLight:
      'Late afternoon and the hour before sunset, when the sun reaches under the arcades.',
    subjects: [
      'Arcades and the hard shade they throw',
      'Old bakeries, tailors and their hand-painted signage',
      'Colonial-era facades along MG Road',
      'People walking through the edge of shade',
      'Pul Gate, for something busier',
    ],
    gettingThere:
      'East of the river, centred on MG Road. Easy to reach and easy to park compared with the old city.',
    faqs: [
      {
        question: 'What is worth photographing in Pune Camp?',
        answer:
          'The arcades and the old shopfronts. Camp was built as a cantonment, so it has wide streets, deep colonnades and a lot of unrenovated architecture — including bakeries and tailors with hand-painted signage older than the businesses.',
      },
    ],
  },
  {
    slug: 'arai-hill',
    name: 'ARAI Hill',
    shortName: 'ARAI',
    area: 'ARAI',
    lead: 'The sunrise walk. A climb on the Kothrud side with the city underneath it and, in the monsoon, cloud sitting in the valleys.',
    body: [
      'ARAI is a hill walk rather than a street walk, and it asks for an earlier start than anything else we do. The point is to be up before the sun is, because the twenty minutes on either side of sunrise is the whole reason to be there.',
      'In the monsoon and just after, mist collects below the ridge and burns off as the light arrives, which gives you layers you cannot get anywhere in the city.',
      'It is a different kind of photography from the peths — landscape, distance, and a lot of waiting. Bring something longer than you would take to Mandai.',
      'The path is straightforward but it is a climb. Allow more time than the distance suggests, particularly in the dark.',
    ],
    bestLight: 'Sunrise, and the twenty minutes before it. Be at the top in the dark.',
    subjects: [
      'The city from above as the light arrives',
      'Mist in the valleys during and after the monsoon',
      'Ridge lines receding into haze',
      'Walkers and runners on the path',
      'Trees against a bright sky',
    ],
    gettingThere:
      'The Kothrud side, above the ARAI campus. Come by vehicle in the dark and walk up; the climb takes longer than it looks.',
    faqs: [
      {
        question: 'What time should I reach ARAI Hill for sunrise photography?',
        answer:
          'Be at the top before first light, which means starting the climb in the dark. The best twenty minutes are before the sun clears the horizon, and arriving as it rises means missing them.',
      },
      {
        question: 'Is ARAI Hill a difficult climb?',
        answer:
          'It is a straightforward path but it is a genuine climb, and it takes longer than the distance suggests — especially in the dark with a bag. Allow more time than you think you need.',
      },
    ],
  },
  {
    slug: 'taljai',
    name: 'Taljai Hill',
    shortName: 'Taljai',
    area: 'Taljai',
    lead: 'Forest inside the city — trails, tall trees and birds, and light that comes through in shafts rather than sheets.',
    body: [
      'Taljai is a wooded hill on the Sahakar Nagar side, and it is the closest thing Pune has to photographing in a forest without leaving the city. The trees are tall enough to break the light up, so mornings here give you shafts and patches rather than open sun.',
      'It is the best of our regular locations for birds, and the quietest. Early is essential — for the light, for the birds, and because it fills up with walkers by eight.',
      'The trails are wide and easy. This is a walk where the photographs come from paying attention to small things: bark, undergrowth, a bird that stays put for four seconds.',
      'Something with reach helps here more than anywhere else we go.',
    ],
    bestLight: 'The first two hours after sunrise, while the light is still coming in low through the trees.',
    subjects: [
      'Shafts of light through the canopy',
      'Birds, for anyone carrying a longer lens',
      'Trails and the people walking them',
      'Bark, undergrowth and detail at close range',
      'Mist between the trees after rain',
    ],
    gettingThere:
      'Above Sahakar Nagar, with entrances from several sides. Easy to reach and there is room to leave a vehicle at the entrance.',
    faqs: [
      {
        question: 'Is Taljai good for bird photography?',
        answer:
          'It is the best of the places we walk regularly. Go in the first two hours after sunrise, before the walkers arrive, and bring the longest lens you own.',
      },
    ],
  },
  {
    slug: 'appa-balwant-chowk',
    name: 'Appa Balwant Chowk',
    shortName: 'ABC',
    area: 'Appa Balwant Chowk',
    lead: 'Pune’s book market — a few lanes of shops stacked floor to ceiling, and shopkeepers who know exactly where everything is.',
    body: [
      'Appa Balwant Chowk, ABC to everybody who goes there, is where Pune buys its books. The shops are small and packed to the ceiling, and the photographs are about density: stacks, spines, and a person somewhere in the middle of them who knows the position of every title.',
      'It is an interior-heavy walk. The light is mostly what comes in through the shopfront, so you are working close to the door or accepting a lot of shadow, and neither is a problem if you plan for it.',
      'Later in the day is better than early — the shops open properly by mid-morning and the students arrive after that.',
      'The customers are half the subject. People shop for books slowly and read while standing, which gives you longer than a street usually does.',
    ],
    bestLight: 'Mid-morning onwards, once the shops are properly open and light reaches the doorways.',
    subjects: [
      'Books stacked floor to ceiling',
      'Shopkeepers reaching for exactly the right spine',
      'Customers reading where they stand',
      'Shopfronts and their signage',
      'The crossroads itself, busy in every direction',
    ],
    gettingThere:
      'In the old city, walkable from Kasba Peth and the Mandai. Come on foot — the lanes around the chowk are not worth driving into.',
    faqs: [
      {
        question: 'What is Appa Balwant Chowk known for?',
        answer:
          'Books. It is Pune’s book market, a few lanes of shops packed floor to ceiling, and it is busiest with students. Photographically it is an interior walk about density and the people who navigate it.',
      },
    ],
  },
];

/** Every place, in the order above. */
export const allPlaces = (): Place[] => places;

export function placeBySlug(slug: string): Place | undefined {
  return places.find((place) => place.slug === slug);
}

/**
 * Every walk held in this place, newest first. Read from data/events.ts rather
 * than listed here, so a new walk in an existing area needs no edit to
 * data/places.ts.
 */
export function walksAtPlace(place: Place): Event[] {
  return upcomingWalks
    .filter((walk) => walk.area === place.area)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/** The place a walk belongs to, for the link up from a walk page. */
export function placeForWalk(walk: Pick<Event, 'area'>): Place | undefined {
  return places.find((place) => place.area === walk.area);
}
