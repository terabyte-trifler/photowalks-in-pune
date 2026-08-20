/* ============================================================================
 * PHOTOGRAPHERS
 * ----------------------------------------------------------------------------
 * Every read here goes through the two public views from migration 0003, or
 * through a table whose select policy is already public. Nothing in this file
 * needs elevated privileges, and none of it can reach a private column.
 *
 *   photographer_cards  public profile columns + walk and photograph counts
 *   walk_attendance     who walked which walk, and when — never a phone number
 *   photos              public to read, owner-writable
 * ========================================================================== */

import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { photographyStyles } from '@/data/photography';
import {
  CARD_PHOTO_COUNT,
  FOUNDER_USERNAME,
  DIRECTORY_PAGE_SIZE,
  PHOTOS_PAGE_SIZE,
  type DirectorySort,
} from '@/lib/directory';
import { getSupabasePublicClient } from '@/lib/supabase/public';
import type { PhotoRecord, PhotographerCard, WalkAttendance } from '@/lib/supabase/types';
import { PHOTO_COLUMNS, PHOTOGRAPHER_CARD_COLUMNS, WALK_ATTENDANCE_COLUMNS } from '@/lib/supabase/columns';

export {
  CARD_PHOTO_COUNT,
  DIRECTORY_PAGE_SIZE,
  MAX_PHOTOS_PER_MEMBER,
  PHOTOS_PAGE_SIZE,
  SORT_OPTIONS,
  imageUrl,
  isDirectorySort,
  photoUrl,
  type DirectorySort,
} from '@/lib/directory';

export interface DirectoryQuery {
  q?: string;
  style?: string;
  city?: string;
  sort?: DirectorySort;
  page?: number;
}

export interface DirectoryResult {
  rows: PhotographerCard[];
  total: number;
  page: number;
  pageCount: number;
  /** Photographs for the cards on this page, keyed by profile id. */
  photos: Map<string, PhotoRecord[]>;
  /** True when the chosen ranking has nothing behind it yet. */
  rankingIsEmpty: boolean;
  /** No photographers at all, as opposed to none matching the search. */
  directoryIsEmpty: boolean;
}

/** PostgREST's or() is comma-separated, so a comma in the term breaks it. */
const forFilter = (value: string): string => value.replace(/[,().*:]/g, ' ').trim();

export async function listPhotographers(query: DirectoryQuery): Promise<DirectoryResult> {
  const page = Math.max(1, query.page ?? 1);
  const sort: DirectorySort = query.sort ?? 'active';
  const empty: DirectoryResult = {
    rows: [], total: 0, page: 1, pageCount: 0,
    photos: new Map(), rankingIsEmpty: false, directoryIsEmpty: true,
  };

  const supabase = getSupabasePublicClient();
  if (!supabase) return empty;

  const q = forFilter(query.q ?? '');

  /* ------------------------------------------------------------------ *
   * The founder is pinned to the front and is not subject to the style,
   * city or sort controls — see FOUNDER_USERNAME in lib/directory.ts.
   *
   * Fetched separately and excluded from the query below rather than
   * sorted to the top, because a filtered query cannot return somebody
   * the filter excludes, and "first" has to mean first on page one and
   * nowhere else.
   *
   * The search box is deliberately still honoured. Typing a name is a
   * lookup, not a filter, and answering it with somebody you did not ask
   * for would be the strange behaviour.
   * ------------------------------------------------------------------ */
  const pinFounder = page === 1 && !q;

  let founder: PhotographerCard | null = null;
  if (pinFounder) {
    const { data: founderRow } = await supabase
      .from('photographer_cards')
      .select(PHOTOGRAPHER_CARD_COLUMNS)
      .eq('username', FOUNDER_USERNAME)
      .maybeSingle();
    founder = (founderRow as PhotographerCard | null) ?? null;
  }

  let builder = supabase
    .from('photographer_cards')
    /* This one kept `select('*')` when the others were given explicit
       columns — the count argument gave it a different shape and it was
       missed. Named now, like the rest. */
    .select(PHOTOGRAPHER_CARD_COLUMNS, { count: 'exact' });

  /* Left out of the page so the pinned copy is not also a duplicate. */
  if (founder) builder = builder.neq('username', FOUNDER_USERNAME);

  if (q) {
    const lower = q.toLowerCase();
    const terms = [
      `full_name.ilike.*${q}*`,
      `username.ilike.*${q}*`,
      `city.ilike.*${q}*`,
    ];
    /* "street" should find people who shoot street, not just anyone with
       Street in their name. */
    for (const style of photographyStyles) {
      if (style.id.includes(lower) || style.label.toLowerCase().includes(lower)) {
        terms.push(`photography_interests.cs.{${style.id}}`);
      }
    }
    builder = builder.or(terms.join(','));
  }

  if (query.style) builder = builder.contains('photography_interests', [query.style]);
  if (query.city) builder = builder.ilike('city', query.city);

  /* created_at is always the last key, so ties never shuffle between pages. */
  if (sort === 'active') {
    builder = builder
      .order('photo_count', { ascending: false })
      .order('walks_attended', { ascending: false });
  } else if (sort === 'walks') {
    builder = builder.order('walks_attended', { ascending: false });
  } else if (sort === 'recent') {
    builder = builder.order('updated_at', { ascending: false });
  }
  builder = builder.order('created_at', { ascending: false });

  const from = (page - 1) * DIRECTORY_PAGE_SIZE;
  const { data, count, error } = await builder.range(from, from + DIRECTORY_PAGE_SIZE - 1);

  if (error) return empty;

  /* One fewer from the query when the founder was excluded, so the page still
     holds DIRECTORY_PAGE_SIZE cards and the count still describes everybody. */
  const rows = founder
    ? [founder, ...((data ?? []) as PhotographerCard[]).slice(0, DIRECTORY_PAGE_SIZE - 1)]
    : ((data ?? []) as PhotographerCard[]);
  const total = (count ?? 0) + (founder ? 1 : 0);

  /* Is the directory itself empty, or did the search simply match nothing?
     The two need different words on screen. */
  let directoryIsEmpty = false;
  if (total === 0) {
    const { count: anyone } = await supabase
      .from('photographer_cards')
      .select('id', { count: 'exact', head: true });
    directoryIsEmpty = (anyone ?? 0) === 0;
  }

  return {
    rows,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / DIRECTORY_PAGE_SIZE)),
    photos: await photosForProfiles(rows.map((row) => row.id)),
    /* Ordering by a count nobody has yet is not a ranking. Say so. */
    rankingIsEmpty:
      (sort === 'walks' && rows.every((row) => row.walks_attended === 0)) ||
      (sort === 'active' && rows.every((row) => row.photo_count === 0 && row.walks_attended === 0)),
    directoryIsEmpty,
  };
}

/**
 * A few frames for each card, in one query rather than one per photographer.
 * Trimmed to CARD_PHOTO_COUNT per person in memory — small enough that asking
 * the database to window it would cost more than it saves.
 */
async function photosForProfiles(profileIds: string[]): Promise<Map<string, PhotoRecord[]>> {
  const byProfile = new Map<string, PhotoRecord[]>();
  if (profileIds.length === 0) return byProfile;

  const supabase = getSupabasePublicClient();
  if (!supabase) return byProfile;

  const { data } = await supabase
    .from('photos')
    .select(PHOTO_COLUMNS)
    .in('profile_id', profileIds)
    .order('created_at', { ascending: false })
    .limit(profileIds.length * CARD_PHOTO_COUNT * 2);

  for (const photo of (data ?? []) as PhotoRecord[]) {
    const existing = byProfile.get(photo.profile_id) ?? [];
    if (existing.length < CARD_PHOTO_COUNT) {
      existing.push(photo);
      byProfile.set(photo.profile_id, existing);
    }
  }
  return byProfile;
}

/** The card row for one photographer, counts included. Cached per request. */
export const getPhotographerCard = cache(
  async (username: string): Promise<PhotographerCard | null> => {
    const supabase = getSupabasePublicClient();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from('photographer_cards')
      .select(PHOTOGRAPHER_CARD_COLUMNS)
      .eq('username', username.toLowerCase())
      .maybeSingle();

    if (error) return null;
    return (data as PhotographerCard | null) ?? null;
  },
);

export interface PhotoPage {
  rows: PhotoRecord[];
  total: number;
  page: number;
  pageCount: number;
}

export async function listPhotos(
  profileId: string,
  { page = 1, pageSize = PHOTOS_PAGE_SIZE }: { page?: number; pageSize?: number } = {},
): Promise<PhotoPage> {
  const supabase = getSupabasePublicClient();
  if (!supabase) return { rows: [], total: 0, page: 1, pageCount: 0 };

  const from = (page - 1) * pageSize;
  const { data, count, error } = await supabase
    .from('photos')
    .select(PHOTO_COLUMNS, { count: 'exact' })
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .range(from, from + pageSize - 1);

  if (error) return { rows: [], total: 0, page: 1, pageCount: 0 };

  const total = count ?? 0;
  return {
    rows: (data ?? []) as PhotoRecord[],
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Which walks this photographer has been on, newest first. */
export async function listAttendance(profileId: string): Promise<WalkAttendance[]> {
  const supabase = getSupabasePublicClient();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from('walk_attendance')
    .select(WALK_ATTENDANCE_COLUMNS)
    .eq('profile_id', profileId)
    .order('event_date', { ascending: false });

  if (error) return [];
  return (data ?? []) as WalkAttendance[];
}

/**
 * Who else walked these walks. This is the edge that makes the site a network
 * rather than a list: a profile leads to a walk, and the walk leads back to
 * other photographers.
 */
export async function listCompanions(
  eventIds: string[],
  excludeProfileId: string,
  limit = 12,
): Promise<PhotographerCard[]> {
  if (eventIds.length === 0) return [];

  const supabase = getSupabasePublicClient();
  if (!supabase) return [];

  const { data: attendance } = await supabase
    .from('walk_attendance')
    .select('profile_id')
    .in('event_id', eventIds);

  const ids = [...new Set(((attendance ?? []) as { profile_id: string }[])
    .map((row) => row.profile_id))].filter((id) => id !== excludeProfileId);

  if (ids.length === 0) return [];

  const { data } = await supabase
    .from('photographer_cards')
    .select(PHOTOGRAPHER_CARD_COLUMNS)
    .in('id', ids.slice(0, limit));

  return (data ?? []) as PhotographerCard[];
}

/**
 * The cities that actually have photographers in them.
 *
 * Cached across requests, not just within one: this reads every profile's city
 * to build the filter list, and the answer changes when somebody joins from a
 * new city — which is rare enough that a fresh round trip on every page view
 * is a poor trade. Five minutes is generous for a list of place names.
 */
export const listCities = unstable_cache(
  async (): Promise<string[]> => {
    const supabase = getSupabasePublicClient();
    if (!supabase) return [];

    const { data } = await supabase.from('photographer_cards').select('city');
    const cities = new Set<string>();
    for (const row of (data ?? []) as { city: string | null }[]) {
      if (row.city) cities.add(row.city);
    }
    return [...cities].sort((a, b) => a.localeCompare(b));
  },
  ['photographer-cities'],
  { revalidate: 300, tags: ['photographers'] },
);

/** A handful of photographers for the homepage strip. */
export async function listFeaturedPhotographers(limit = 4): Promise<{
  rows: PhotographerCard[];
  photos: Map<string, PhotoRecord[]>;
}> {
  const supabase = getSupabasePublicClient();
  if (!supabase) return { rows: [], photos: new Map() };

  const { data } = await supabase
    .from('photographer_cards')
    .select(PHOTOGRAPHER_CARD_COLUMNS)
    .order('photo_count', { ascending: false })
    .order('walks_attended', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);

  const rows = (data ?? []) as PhotographerCard[];
  return { rows, photos: await photosForProfiles(rows.map((row) => row.id)) };
}
