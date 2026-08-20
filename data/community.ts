/* ============================================================================
 * COMMUNITY
 * ----------------------------------------------------------------------------
 * The real numbers, given by the organiser. Two of these were "XX" and the
 * member count said 1000+, which was a placeholder rather than a claim — worth
 * correcting downwards, because a community that says a thousand and turns out
 * to be a hundred has told its first visitor something untrue on the way in.
 * ========================================================================== */

export interface CommunityStats {
  members: string;
  walks: string;
  years: string;
}

export const communityStats: CommunityStats = {
  members: '100+',
  walks: '10+',
  years: '1',
};

/**
 * The year label follows the number rather than being written down twice.
 * "1 Years of Pune" reads as a bug, and so does "2 Year" the day this becomes
 * two — pluralising here means neither can happen by forgetting.
 */
const yearsLabel = (value: string): string =>
  value.replace(/\D/g, '') === '1' && !value.includes('+')
    ? 'Year of Pune'
    : 'Years of Pune';

export const statsDisplay = [
  { value: communityStats.members, label: 'Photographers' },
  { value: communityStats.walks, label: 'Walks' },
  { value: communityStats.years, label: yearsLabel(communityStats.years) },
] as const;

export interface InstagramPost {
  id: string;
  image: string;
  permalink: string;
  caption: string;
}

/** Local until the Graph API is wired up — see lib/instagram.ts. */
export const instagramPosts: InstagramPost[] = [
  { id: 'ig-01', image: '/images/instagram/post-01.jpg', permalink: 'https://instagram.com/photowalksinpune', caption: 'Kasba, 7:04 AM' },
  { id: 'ig-02', image: '/images/instagram/post-02.jpg', permalink: 'https://instagram.com/photowalksinpune', caption: 'Mandai on a Saturday' },
  { id: 'ig-03', image: '/images/instagram/post-03.jpg', permalink: 'https://instagram.com/photowalksinpune', caption: 'After the rain, FC Road' },
  { id: 'ig-04', image: '/images/instagram/post-04.jpg', permalink: 'https://instagram.com/photowalksinpune', caption: 'A wada door in Shukrawar' },
  { id: 'ig-05', image: '/images/instagram/post-05.jpg', permalink: 'https://instagram.com/photowalksinpune', caption: 'The river, six o’clock' },
  { id: 'ig-06', image: '/images/instagram/post-06.jpg', permalink: 'https://instagram.com/photowalksinpune', caption: 'Tulshibaug, looking up' },
];
