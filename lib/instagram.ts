/* ============================================================================
 * INSTAGRAM
 * ----------------------------------------------------------------------------
 * The grid renders whatever this returns, so going live is a change here only.
 *
 *   // app/api/instagram/route.ts
 *   export const revalidate = 3600;
 *   export async function GET() {
 *     const res = await fetch(
 *       'https://graph.instagram.com/me/media' +
 *       '?fields=id,media_url,permalink,caption&limit=6' +
 *       `&access_token=${process.env.INSTAGRAM_ACCESS_TOKEN}`);
 *     const { data } = await res.json();
 *     return Response.json(data.map((p: never) => ({ ... })));
 *   }
 * ========================================================================== */

import { instagramPosts, type InstagramPost } from '@/data/community';

export async function getInstagramPosts(): Promise<InstagramPost[]> {
  return instagramPosts;
}
