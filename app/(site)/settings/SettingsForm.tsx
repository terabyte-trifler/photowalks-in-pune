'use client';

import Link from 'next/link';
import { useActionState, useEffect, useState } from 'react';
import { AuthNotice } from '@/components/auth/AuthNotice';
import { useAuth } from '@/components/auth/AuthProvider';
import { photographyStyles } from '@/data/photography';
import { AvatarUpload } from '@/components/photographers/AvatarUpload';
import { LIMITS } from '@/lib/auth/validation';
import type { Profile } from '@/lib/supabase/types';
import { saveProfile, type SaveProfileState } from './actions';

const INITIAL: SaveProfileState = { status: 'idle' };

export function SettingsForm({ profile, email }: { profile: Profile; email: string }) {
  const { refreshProfile } = useAuth();
  const [state, formAction, pending] = useActionState(saveProfile, INITIAL);

  const [bio, setBio] = useState(profile.bio ?? '');
  const [interests, setInterests] = useState<string[]>(profile.photography_interests ?? []);

  /* The header shows the name and the avatar, so it has to hear about a save. */
  useEffect(() => {
    if (state.status === 'saved') void refreshProfile();
  }, [state.status, refreshProfile]);

  const username = state.username ?? profile.username;

  return (
    <form action={formAction} noValidate>
      <fieldset disabled={pending} className="border-0 p-0">
        <legend className="sr-only">Profile details</legend>

        <AvatarUpload initialUrl={profile.avatar_url} fullName={profile.full_name} />

        <div className="grid gap-x-10 sm:grid-cols-2">
          <Field
            name="full_name"
            label="Full name"
            defaultValue={profile.full_name}
            error={state.errors?.full_name}
            maxLength={LIMITS.fullName}
            autoComplete="name"
          />
          <Field
            name="username"
            label="Username"
            defaultValue={profile.username}
            error={state.errors?.username}
            maxLength={LIMITS.username}
            hint={`photowalksinpune.com/photographers/${username}`}
            autoComplete="off"
          />
          <Field
            name="city"
            label="City"
            defaultValue={profile.city}
            error={state.errors?.city}
            maxLength={LIMITS.city}
            autoComplete="address-level2"
          />
          <Field
            name="instagram_username"
            label="Instagram (optional)"
            defaultValue={profile.instagram_username ?? ''}
            error={state.errors?.instagram_username}
            maxLength={60}
            placeholder="@yourhandle"
            hint="Handle or profile link"
            autoComplete="off"
          />
          <Field
            name="website_url"
            label="Website (optional)"
            defaultValue={profile.website_url ?? ''}
            error={state.errors?.website_url}
            maxLength={LIMITS.website}
            placeholder="example.com"
            hint="Your own site, if you have one"
            autoComplete="url"
          />
        </div>

        <div className="mb-6">
          <div className="flex items-baseline justify-between gap-4">
            <label className="field-label" htmlFor="settings-bio">
              Bio (optional)
            </label>
            <span className="mb-2 font-mono text-micro uppercase text-muted">
              {bio.length}/{LIMITS.bio}
            </span>
          </div>
          <textarea
            id="settings-bio"
            name="bio"
            rows={3}
            maxLength={LIMITS.bio}
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            placeholder="What you photograph, and where you like to walk."
            className="field-input resize-y leading-[1.7]"
            aria-invalid={Boolean(state.errors?.bio)}
            aria-describedby={state.errors?.bio ? 'settings-bio-error' : undefined}
          />
          {state.errors?.bio && (
            <span
              id="settings-bio-error"
              role="alert"
              className="mt-2 block font-mono text-micro uppercase text-accent"
            >
              {state.errors.bio}
            </span>
          )}
        </div>

        {/* Styles, from data/photography.ts — the same vocabulary the
            directory filters by, so picking one here makes you findable. */}
        <fieldset className="mb-8 border-0 p-0">
          <legend className="field-label">
            What you photograph — up to {LIMITS.interests}
          </legend>
          <ul className="mt-1 flex flex-wrap gap-2">
            {photographyStyles.map((category) => {
              const checked = interests.includes(category.id);
              const full = interests.length >= LIMITS.interests && !checked;

              return (
                <li key={category.id}>
                  <label
                    className={`inline-flex cursor-pointer items-center border px-3 py-2 font-mono text-micro uppercase transition-colors ${
                      checked
                        ? 'border-foreground bg-foreground text-background'
                        : 'border-border-strong text-foreground-soft hover:border-foreground'
                    } ${full ? 'cursor-not-allowed opacity-40' : ''}`}
                    title={category.note}
                  >
                    <input
                      type="checkbox"
                      name="photography_interests"
                      value={category.id}
                      checked={checked}
                      disabled={full}
                      onChange={(event) =>
                        setInterests((current) =>
                          event.target.checked
                            ? [...current, category.id]
                            : current.filter((id) => id !== category.id),
                        )
                      }
                      className="sr-only"
                    />
                    {category.label}
                  </label>
                </li>
              );
            })}
          </ul>
        </fieldset>

        <div className="mb-8 border-t border-border pt-6">
          <p className="field-label">Email</p>
          <p className="text-[0.9375rem] text-foreground-soft">{email}</p>
          <p className="meta mt-2 normal-case tracking-[0.08em]">
            Held by Supabase Auth, never published on your profile. Changing it is not
            built yet.
          </p>
        </div>

        {state.status === 'error' && state.message && (
          <AuthNotice tone="error" className="mb-6">
            {state.message}
          </AuthNotice>
        )}

        {state.status === 'saved' && (
          <AuthNotice tone="success" className="mb-6">
            {state.message ?? 'Saved.'}
          </AuthNotice>
        )}

        <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
          <button
            type="submit"
            disabled={pending}
            aria-busy={pending}
            className="cta-solid disabled:opacity-60"
          >
            {pending ? 'Saving' : 'Save profile'} <span aria-hidden="true">→</span>
          </button>

          <Link href={`/photographers/${username}`} className="cta">
            View public profile <span aria-hidden="true">→</span>
          </Link>

          <Link href={`/photographers/${username}/photos`} className="cta">
            Manage photographs <span aria-hidden="true">→</span>
          </Link>
        </div>
      </fieldset>
    </form>
  );
}

function Field({
  name,
  label,
  defaultValue,
  error,
  hint,
  maxLength,
  placeholder,
  autoComplete,
}: {
  name: string;
  label: string;
  defaultValue: string;
  error?: string;
  hint?: string;
  maxLength?: number;
  placeholder?: string;
  autoComplete?: string;
}) {
  const id = `settings-${name}`;

  return (
    <div className="mb-6">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        name={name}
        className="field-input"
        defaultValue={defaultValue}
        maxLength={maxLength}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
      />
      {error ? (
        <span
          id={`${id}-error`}
          role="alert"
          className="mt-2 block font-mono text-micro uppercase text-accent"
        >
          {error}
        </span>
      ) : (
        hint && (
          <span
            id={`${id}-hint`}
            className="mt-2 block truncate font-mono text-micro uppercase text-muted"
          >
            {hint}
          </span>
        )
      )}
    </div>
  );
}
