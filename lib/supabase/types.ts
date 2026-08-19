/* ============================================================================
 * DATABASE TYPES
 * ----------------------------------------------------------------------------
 * Hand-written rather than generated, so the repository has no dependency on
 * the Supabase CLI. If you later run
 *
 *   npx supabase gen types typescript --project-id <id> > lib/supabase/types.ts
 *
 * the shape below is what it should produce for the profiles table.
 *
 * The schema is deliberately open at the bottom: photos, groups, challenges
 * and challenge_submissions will all reference profiles.id, so adding them
 * means adding rows to this file and nothing else — as walk_rsvps did.
 * ========================================================================== */

import type { PhotographyStyle } from '@/data/photography';

/* A type alias rather than an interface on purpose: supabase-js requires each
   Row to satisfy Record<string, unknown>, and only type aliases get the
   implicit index signature that makes that true. An interface here compiles
   every query down to `never`. */
export type Profile = {
  id: string;
  full_name: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  city: string;
  instagram_username: string | null;
  website_url: string | null;
  photography_interests: PhotographyStyle[] | null;
  created_at: string;
  updated_at: string;
};

/** A photograph a member has uploaded. The file itself lives in Storage. */
export type PhotoRecord = {
  id: string;
  profile_id: string;
  storage_path: string;
  caption: string | null;
  location: string | null;
  taken_at: string | null;
  width: number | null;
  height: number | null;
  created_at: string;
};

/**
 * Public projections (see migration 0003). Both are read-only views that
 * expose a fixed column list; neither can be asked for a private column.
 */
export type WalkAttendance = {
  profile_id: string;
  event_id: string;
  event_title: string;
  event_date: string;
};

export type PhotographerCard = Omit<Profile, 'id'> & {
  id: string;
  walks_attended: number;
  photo_count: number;
};

/** One row per member per walk. See migration 0002. */
export type WalkRsvp = {
  id: string;
  profile_id: string;
  event_id: string;
  event_title: string;
  /** ISO date (yyyy-mm-dd) of the walk. */
  event_date: string;
  whatsapp: string;
  experience: string;
  consent: boolean;
  created_at: string;
};

/** The columns a person is allowed to change about themselves. */
export type ProfileUpdate = Partial<
  Pick<
    Profile,
    | 'full_name'
    | 'username'
    | 'avatar_url'
    | 'bio'
    | 'city'
    | 'instagram_username'
    | 'website_url'
    | 'photography_interests'
  >
>;

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, 'created_at' | 'updated_at'> &
          Partial<Pick<Profile, 'created_at' | 'updated_at'>>;
        Update: ProfileUpdate;
        /* Populated as photos, groups and challenges arrive. */
        Relationships: [];
      };
      photos: {
        Row: PhotoRecord;
        Insert: Omit<PhotoRecord, 'id' | 'created_at'> &
          Partial<Pick<PhotoRecord, 'id' | 'created_at'>>;
        Update: Partial<Pick<PhotoRecord, 'caption' | 'location' | 'taken_at'>>;
        Relationships: [
          {
            foreignKeyName: 'photos_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      walk_rsvps: {
        Row: WalkRsvp;
        Insert: Omit<WalkRsvp, 'id' | 'created_at'> &
          Partial<Pick<WalkRsvp, 'id' | 'created_at'>>;
        /* No UPDATE policy exists: cancel and rejoin instead. */
        Update: never;
        Relationships: [
          {
            foreignKeyName: 'walk_rsvps_profile_id_fkey';
            columns: ['profile_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: {
      walk_attendance: { Row: WalkAttendance; Relationships: [] };
      photographer_cards: { Row: PhotographerCard; Relationships: [] };
    };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
