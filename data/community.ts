/* ============================================================================
 * COMMUNITY
 * ----------------------------------------------------------------------------
 * Two of the three statistics are "XX" on purpose. Put the real walk count and
 * the real number of years in before launch rather than inventing them.
 * ========================================================================== */

export interface CommunityStats {
  members: string;
  walks: string;
  years: string;
}

export const communityStats: CommunityStats = {
  members: '1000+',
  walks: 'XX',   // TODO: real number of walks run
  years: 'XX',   // TODO: real number of years
};

export const statsDisplay = [
  { value: communityStats.members, label: 'Photographers' },
  { value: communityStats.walks, label: 'Walks' },
  { value: communityStats.years, label: 'Years of Pune' },
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
