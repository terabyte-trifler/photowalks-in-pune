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

import type { PhotoCategory } from '@/data/photos';

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
  photography_interests: PhotoCategory[] | null;
  created_at: string;
  updated_at: string;
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
    /* The idiom `supabase gen types` emits for an empty section. */
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
