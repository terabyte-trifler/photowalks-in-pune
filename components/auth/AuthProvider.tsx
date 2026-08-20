'use client';

import { useRouter } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { isSupabaseConfigured, siteOrigin } from '@/lib/supabase/config';
import type { Profile } from '@/lib/supabase/types';
import { authErrorMessage } from '@/lib/auth/errors';
import { PROFILE_COLUMNS } from '@/lib/supabase/columns';

/* ============================================================================
 * AUTH STATE
 * ----------------------------------------------------------------------------
 * One provider, mounted in the root layout, holding the three states the site
 * cares about: loading, signed out, signed in. Its children stay server
 * components — the provider only wraps them — so the homepage is still
 * prerendered and only the header ships this code.
 *
 * Deliberately thin: it owns session and profile, and nothing else. Anything
 * that needs to *authorize* rather than *display* asks the server, because a
 * value in here came from the browser and the browser can lie.
 * ========================================================================== */

export interface AuthResult {
  ok: boolean;
  error?: string;
  /** Signup only: the account exists but the email link has not been used yet. */
  needsEmailConfirmation?: boolean;
}

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  /** False when no Supabase project is attached — the screens explain it. */
  configured: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (input: { fullName: string; email: string; password: string }) => Promise<AuthResult>;
  signInWithGoogle: (next?: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<AuthResult>;
  updatePassword: (password: string) => Promise<AuthResult>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const NOT_CONFIGURED: AuthResult = {
  ok: false,
  error: 'Accounts are not connected yet on this build.',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const supabase = getSupabaseBrowserClient();
  const configured = isSupabaseConfigured();

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(configured);

  /* Which user's profile is in state, so a stale response cannot overwrite a
     newer one when somebody signs out mid-request. */
  const profileFor = useRef<string | null>(null);

  const loadProfile = useCallback(
    async (nextUser: User | null) => {
      if (!supabase || !nextUser) {
        profileFor.current = null;
        setProfile(null);
        return;
      }

      profileFor.current = nextUser.id;
      const { data } = await supabase
        .from('profiles')
        .select(PROFILE_COLUMNS)
        .eq('id', nextUser.id)
        .maybeSingle();

      if (profileFor.current !== nextUser.id) return;
      setProfile(data ?? null);
    },
    [supabase],
  );

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;

    const apply = async (session: Session | null) => {
      if (!active) return;
      setUser(session?.user ?? null);
      await loadProfile(session?.user ?? null);
      if (active) setLoading(false);
    };

    /* onAuthStateChange fires INITIAL_SESSION on mount, so this covers the
       first paint as well as every later sign-in, sign-out, token refresh and
       change made in another tab. That is what keeps the header correct
       without a manual reload. */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      void apply(session);
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
        /* Re-render server components so anything rendered for the previous
           visitor is thrown away. */
        router.refresh();
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase, loadProfile, router]);

  const signIn = useCallback<AuthContextValue['signIn']>(
    async (email, password) => {
      if (!supabase) return NOT_CONFIGURED;
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) return { ok: false, error: authErrorMessage(error, 'signin') };
        return { ok: true };
      } catch (error) {
        return { ok: false, error: authErrorMessage(error, 'signin') };
      }
    },
    [supabase],
  );

  const signUp = useCallback<AuthContextValue['signUp']>(
    async ({ fullName, email, password }) => {
      if (!supabase) return NOT_CONFIGURED;
      try {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            /* Read by the on_auth_user_created trigger, which mints the
               username and writes the profile row. */
            data: { full_name: fullName.trim() },
            emailRedirectTo: `${siteOrigin()}/auth/callback?next=/profile`,
          },
        });

        if (error) return { ok: false, error: authErrorMessage(error, 'signup') };

        /* With email confirmation switched on, Supabase does not reveal that
           an address is taken: it returns a user with no identities and sends
           nothing. Say something true that helps either way. */
        if (data.user && data.user.identities && data.user.identities.length === 0) {
          return {
            ok: false,
            error: 'That email already has an account. Log in, or reset your password.',
          };
        }

        return { ok: true, needsEmailConfirmation: !data.session };
      } catch (error) {
        return { ok: false, error: authErrorMessage(error, 'signup') };
      }
    },
    [supabase],
  );

  const signInWithGoogle = useCallback<AuthContextValue['signInWithGoogle']>(
    async (next = '/profile') => {
      if (!supabase) return NOT_CONFIGURED;
      try {
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: `${siteOrigin()}/auth/callback?next=${encodeURIComponent(next)}`,
            queryParams: { prompt: 'select_account' },
          },
        });
        if (error) return { ok: false, error: authErrorMessage(error, 'oauth') };
        /* The browser is on its way to Google; the page is about to unload. */
        return { ok: true };
      } catch (error) {
        return { ok: false, error: authErrorMessage(error, 'oauth') };
      }
    },
    [supabase],
  );

  /**
   * Sign-out leaves the site, it does not navigate within it.
   *
   * `router.push()` followed by `router.refresh()` looks right and is not:
   * the refresh targets the current route and discards the navigation that is
   * still in flight, so people end up still standing on the page they just
   * signed out of, with the server-rendered half of it — an "Edit profile"
   * button, someone's settings — rendered for a session that no longer
   * exists. A document navigation is deterministic: every cached RSC payload
   * for the old session goes with it.
   *
   * The cost is one page load on an action people take rarely and deliberately.
   */
  const signOut = useCallback(async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    profileFor.current = null;
    window.location.assign('/');
  }, [supabase]);

  const sendPasswordReset = useCallback<AuthContextValue['sendPasswordReset']>(
    async (email) => {
      if (!supabase) return NOT_CONFIGURED;
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${siteOrigin()}/auth/callback?next=/reset-password`,
        });
        if (error) return { ok: false, error: authErrorMessage(error, 'reset') };
        return { ok: true };
      } catch (error) {
        return { ok: false, error: authErrorMessage(error, 'reset') };
      }
    },
    [supabase],
  );

  const updatePassword = useCallback<AuthContextValue['updatePassword']>(
    async (password) => {
      if (!supabase) return NOT_CONFIGURED;
      try {
        const { error } = await supabase.auth.updateUser({ password });
        if (error) return { ok: false, error: authErrorMessage(error, 'update') };
        return { ok: true };
      } catch (error) {
        return { ok: false, error: authErrorMessage(error, 'update') };
      }
    },
    [supabase],
  );

  const refreshProfile = useCallback(async () => {
    await loadProfile(user);
  }, [loadProfile, user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      configured,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      sendPasswordReset,
      updatePassword,
      refreshProfile,
    }),
    [
      user,
      profile,
      loading,
      configured,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      sendPasswordReset,
      updatePassword,
      refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>');
  return context;
}
