/* ============================================================================
 * THE HERO PHOTOGRAPHS
 * ----------------------------------------------------------------------------
 * Five frames from members, cycled behind the masthead. Ordered for contrast
 * rather than by who took them: a green lane, an ochre wada facade, a fruit
 * cart against grey stone, a black-and-white blur, a shuttered shopfront. Two
 * similar frames next to each other read as a glitch rather than a change.
 *
 * The first is the one that loads with priority and is what somebody sees
 * before any rotation starts, so it carries the most weight.
 *
 * Credits are per frame and shown with it. The gallery credits every
 * photograph and the hero should not be the one place that quietly does not.
 * ========================================================================== */

export interface HeroFrame {
  src: string;
  alt: string;
  /** Shown in the corner while this frame is up. */
  credit: string;
}

export const heroFrames: HeroFrame[] = [
  {
    src: '/images/hero/pune-hero-01.jpg',
    alt: 'A narrow Pune lane with people walking away between old buildings, an autorickshaw parked to one side and greenery overhead',
    credit: 'Baguette',
  },
  {
    src: '/images/hero/pune-hero-02.jpg',
    alt: 'A cyclist and a man in orange passing the long arched facade of an old wada',
    credit: 'Aditya Rohanekar',
  },
  {
    src: '/images/hero/pune-hero-03.jpg',
    alt: 'A handcart of tomatoes and limes against a stone wall, its seller waiting beside it',
    credit: 'Baguette',
  },
  {
    src: '/images/hero/pune-hero-04.jpg',
    alt: 'An older man riding a bicycle, the road behind him blurred with movement, in black and white',
    credit: 'Ankush Gupta',
  },
  {
    src: '/images/hero/pune-hero-05.jpg',
    alt: 'A man resting outside a shuttered shopfront beneath a painted Multi Colour Xerox sign',
    credit: 'Baguette',
  },
];
