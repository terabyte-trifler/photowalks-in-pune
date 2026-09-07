/* ============================================================================
 * WHAT EACH WALK WAS ASKING FOR
 * ----------------------------------------------------------------------------
 * A walk page had eleven words on it. That is too little to be worth finding,
 * and the obvious fix — three hundred words about the place — is the wrong one
 * now that /places/[slug] exists: three walks have been to Mandai and three to
 * FC Road, so location prose on each would rebuild the exact duplication the
 * place pages were made to end.
 *
 * So a walk page says what that MORNING was for. The brief, the hour, what you
 * would have been looking for. The place page says what the place is like, and
 * the two do not repeat each other.
 *
 * The material is already in the data. `theme` distinguishes three FC Road
 * walks that share a street — 'Street', 'Street', 'Form · evening light' — and
 * the dates say which were consecutive. Everything below is drawn from those
 * two fields and the location, and from nothing else.
 *
 * WHAT IS NOT HERE, AND WHY
 * No account of what happened. Not what the light did that morning, not what
 * anybody found, not how it went. Those are real mornings that real people
 * attended, and inventing a record of them would be writing a claim about
 * those people. It is also the one kind of writing no competitor can copy,
 * which is exactly why it should be written by somebody who was there.
 *
 * Add it under the same key. A walk with a firsthand paragraph should lose the
 * generic one — replace, do not append.
 * ========================================================================== */

/** Keyed by Event.slug. Absent is fine: the page renders without it. */
export const walkNotes: Record<string, string[]> = {
  'camp-colonial-lines': [
    'An afternoon brief rather than a morning one, which changes what Camp offers. The arcades along the Pul Gate end run deep, and late light reaches under them at an angle it never manages at midday — so the subject is the edge between the colonnade and the pavement, and the people crossing it.',
    'Heritage here means working buildings rather than monuments. Shopfronts, signage and the tailors and bakeries still trading behind them.',
  ],
  'arai-30-august': [
    'The only walk on the list that starts in the dark. Being on the ridge before first light is the whole brief: the twenty minutes before sunrise are the reason to climb, and arriving as the sun clears the horizon means missing them.',
    'Late August is the end of the monsoon, when mist still collects below the ridge and burns off as the light arrives. Longer lenses earn their weight here in a way they never do in the peths.',
  ],
  'mandai-20-june': [
    'A markets brief at the hour the market is actually working. Before eight the aisles are still passable, the produce is arriving rather than selling, and the light is coming through the ironwork roof at an angle that moves across the floor as the morning goes.',
    'Setting up is a more generous moment to photograph than the middle of a sale, and it is the one this walk was timed for.',
  ],
  'camp-27-june': [
    'The same ground as the afternoon Camp walk, asked the other way round. Morning light comes down the street rather than under the arcades, so the colonnades read as shape and shadow instead of a lit edge — and the shops are opening rather than closing.',
  ],
  'fc-road-11-july': [
    'The first of two consecutive mornings on FC Road, and a plain street brief: no theme to hide behind, just the practice of photographing strangers on the least intimidating street in the city.',
    'FC Road is used to being looked at. That is what makes it the right place to learn on — nobody minds a camera, so there is nothing to overcome except your own hesitation at the moment that matters.',
  ],
  'fc-road-12-july': [
    'The second morning of the pair, deliberately the same street. Going back to the same ground on consecutive days is a brief in itself: the easy frames were taken yesterday, so what is left is the harder looking.',
  ],
  'kasba-peth-15-july': [
    'An old city brief, which in Kasba Peth means people at work. The neighbourhood is still organised by trade, so the walk follows the lanes rather than a route — the copper beaters, the potters, and the wada doorways between them.',
    'Early, because the workshops open early and the lanes hold shade while the sky above them is already bright.',
  ],
  'fc-road-shape-hunt-19-july': [
    'The same street as the two July mornings and a completely different instruction: photograph form. Not people, not shopfronts — shape, line, repetition and the way evening light cuts them out of a crowded street.',
    'A constraint like this is the most useful thing you can be handed on familiar ground. "Photograph FC Road" produces what you already expect. "Find shapes" does not.',
  ],
  'taljai-26-july': [
    'A nature brief in the monsoon, on a wooded hill inside the city. The canopy breaks the light into shafts and patches instead of open sun, and after rain the mist sits between the trees for the first hour.',
    'The quietest walk on the list, and the one where the photographs come from small things: bark, undergrowth, and a bird that holds still for four seconds.',
  ],
  'flower-market-8-august': [
    'A colour brief rather than a market one. The flower section turns over faster than the vegetable aisles and sits lower and denser, so it is worked close — and the first of two consecutive mornings there is the one for finding where the colour actually is.',
  ],
  'flower-market-9-august': [
    'The second consecutive morning in the flower section, with the geography already known. Coming back the next day is what turns a set of first impressions into a considered frame.',
  ],
  'appa-balwant-chowk-15-august': [
    'A street brief that is mostly interiors. ABC is Pune’s book market, a few lanes of shops packed floor to ceiling, so the light is whatever reaches the doorway and the frames are about density.',
    'People shop for books slowly and read where they stand, which gives you longer than a street usually does.',
  ],
};

export const notesForWalk = (slug: string): string[] => walkNotes[slug] ?? [];
