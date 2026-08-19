'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Dialog, DialogClose } from '@/components/ui/Dialog';
import { useAuth } from '@/components/auth/AuthProvider';
import { experienceLevels, type Event, type ExperienceLevel } from '@/data/events';
import { site } from '@/data/site';
import { longDate, priceLabel } from '@/lib/utils';
import {
  findExistingRsvp,
  isBackendConfigured,
  submitRsvp,
  validateRsvp,
  type RsvpErrors,
} from '@/lib/rsvp';

type Status = 'editing' | 'submitting' | 'confirmed' | 'failed';

interface FormValues {
  name: string;
  email: string;
  whatsapp: string;
  instagram: string;
  experience: ExperienceLevel;
  consent: boolean;
}

const EMPTY: FormValues = {
  name: '',
  email: '',
  whatsapp: '',
  instagram: '',
  experience: experienceLevels[0],
  consent: false,
};

export function RSVPModal({ event, onClose }: { event: Event | null; onClose: () => void }) {
  const { user, profile, loading: authLoading } = useAuth();
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [errors, setErrors] = useState<RsvpErrors>({});
  const [status, setStatus] = useState<Status>('editing');
  const [failure, setFailure] = useState('');
  const [persisted, setPersisted] = useState(false);
  const [alreadyJoined, setAlreadyJoined] = useState(false);

  /* A fresh form each time a different walk is opened. */
  useEffect(() => {
    if (event) {
      setValues(EMPTY);
      setErrors({});
      setStatus('editing');
      setFailure('');
      setAlreadyJoined(false);
    }
  }, [event]);

  /* Already on this walk? Open on the confirmation rather than on a form the
     one-per-walk constraint would reject. */
  useEffect(() => {
    if (!event || !user) return;
    let active = true;
    void findExistingRsvp(user.id, event.id).then((joined) => {
      if (!active || !joined) return;
      setAlreadyJoined(true);
      setPersisted(true);
      setStatus('confirmed');
    });
    return () => {
      active = false;
    };
  }, [event, user]);

  /* Having an account is the point of asking for one: the name, email and
     Instagram handle are already known, so the form only asks for what a walk
     actually needs. Only empty fields are filled, so nothing typed is lost if
     the profile arrives a moment later. */
  useEffect(() => {
    if (!event) return;
    setValues((current) => ({
      ...current,
      name: current.name || profile?.full_name || '',
      email: current.email || user?.email || '',
      instagram: current.instagram || profile?.instagram_username || '',
    }));
  }, [event, user, profile]);

  if (!event) {
    return <Dialog open={false} onClose={onClose} label="RSVP"><div /></Dialog>;
  }

  /* ------------------------------------------------------------------ *
   * The gate. Browsing the walks stays open to everyone; holding a place
   * on one does not, because a spot belongs to a person we can reach on
   * the morning of the walk.
   *
   * This is deliberately not a redirect. Joining is the primary action on
   * the page, and throwing somebody to /login the instant they press it
   * loses both their place on the page and which walk they meant. The
   * dialog opens as it always did, still showing the walk, and asks.
   * `next` carries the walk back so the form reopens on it afterwards.
   * ------------------------------------------------------------------ */
  if (!authLoading && !user) {
    const back = `/?rsvp=${encodeURIComponent(event.slug)}`;
    return (
      <Dialog open onClose={onClose} label={`Log in to join ${event.title}`} className="max-w-[560px]">
        <div className="mb-7 flex items-start justify-between gap-4 border-b border-border pb-4">
          <div>
            <p className="meta">Join a walk</p>
            <h2 className="display mt-2 text-display-md">{event.title}</h2>
            <p className="meta mt-2">
              {longDate(event.date)} · {event.time} · {priceLabel(event.price)}
            </p>
          </div>
          <DialogClose onClose={onClose} />
        </div>

        <p className="display text-display-md">First, an introduction.</p>
        <p className="mt-4 font-display text-lead text-foreground-soft">
          We keep the walks small, and the meeting point goes out on the morning
          itself — so an account is simply how we know where to find you. It also
          remembers the walks you have joined, which means we need only ask you
          this once.
        </p>

        <div className="mt-[clamp(2rem,4vw,2.5rem)] grid gap-4">
          <Link href={`/signup?next=${encodeURIComponent(back)}`} className="cta-solid justify-between">
            Create an account <span aria-hidden="true">→</span>
          </Link>
          <Link href={`/login?next=${encodeURIComponent(back)}`} className="cta-ghost justify-between">
            I already have one <span aria-hidden="true">→</span>
          </Link>
        </div>

        <p className="meta mt-5 normal-case tracking-[0.06em]">
          The rest of the site stays open — the walks, the archive and the community
          ask nothing of you.
        </p>
      </Dialog>
    );
  }

  /* Auth is still resolving. Hold the dialog's shape rather than flashing the
     sign-in panel at somebody who is in fact logged in. */
  if (authLoading) {
    return (
      <Dialog open onClose={onClose} label={`RSVP for ${event.title}`} className="max-w-[560px]">
        <div className="mb-7 flex items-start justify-between gap-4 border-b border-border pb-4">
          <div>
            <p className="meta">RSVP</p>
            <h2 className="display mt-2 text-display-md">{event.title}</h2>
          </div>
          <DialogClose onClose={onClose} />
        </div>
        <p className="meta" role="status">One moment…</p>
      </Dialog>
    );
  }

  const update = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    if (key in errors) setErrors((current) => ({ ...current, [key]: undefined }));
  };

  async function handleSubmit(formEvent: React.FormEvent) {
    formEvent.preventDefault();
    if (status === 'submitting' || !event) return;

    const found = validateRsvp(values);
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    setStatus('submitting');
    const result = await submitRsvp({
      eventId: event.id,
      eventTitle: event.title,
      eventDate: event.date,
      /* The future walk_rsvps row belongs to a profile, not to a typed-in
         name. See the DDL note in lib/rsvp.ts. */
      profileId: user?.id ?? null,
      name: values.name.trim(),
      email: values.email.trim(),
      whatsapp: values.whatsapp.trim(),
      instagram: values.instagram.trim() || undefined,
      experience: values.experience,
      consent: values.consent,
    });

    if (!result.ok) {
      setFailure(result.error ?? 'That did not save.');
      setStatus('failed');
      return;
    }

    setPersisted(result.persisted);
    setAlreadyJoined(Boolean(result.alreadyJoined));
    setStatus('confirmed');
  }

  return (
    <Dialog
      open
      onClose={onClose}
      label={`RSVP for ${event.title}`}
      className="max-w-[560px]"
    >
      {status === 'confirmed' ? (
        <>
          <div className="mb-7 flex items-start justify-between gap-4 border-b border-border pb-4">
            <span className="meta">{alreadyJoined ? 'Already joined' : 'Confirmed'}</span>
            <DialogClose onClose={onClose} />
          </div>

          <h2 className="display text-display-lg">
            {alreadyJoined ? <>Already in.</> : <>You&rsquo;re in.</>}
          </h2>
          <p className="mt-4 font-display text-lead text-foreground-soft">
            {alreadyJoined
              ? 'You joined this walk already — there is nothing more to do.'
              : 'We\u2019ll send the walk details and meeting point to your WhatsApp and email.'}
          </p>
          <p className="meta mt-5">
            {event.title} · {longDate(event.date)} · {event.time} · {event.location}
          </p>

          {!persisted && (
            <p
              className="mt-6 border-l-2 border-accent bg-subtle py-3 pl-4 font-mono text-micro uppercase text-foreground-soft"
              role="status"
            >
              Preview build — no backend is connected, so this RSVP was kept in this
              browser only and nobody has received it. Message us on WhatsApp to
              actually hold your spot.
            </p>
          )}

          <div className="mt-[clamp(2rem,4vw,2.5rem)] grid gap-4">
            <a
              className="cta-solid justify-between"
              href={site.links.whatsapp}
              target="_blank"
              rel="noreferrer noopener"
            >
              Join WhatsApp community <span aria-hidden="true">→</span>
            </a>
            <Link href="/my-walks" className="cta-ghost justify-between">
              See my walks <span aria-hidden="true">→</span>
            </Link>
            <button type="button" className="cta justify-between" onClick={onClose}>
              Back to site <span aria-hidden="true">↩</span>
            </button>
          </div>
        </>
      ) : (
        <>
          <div className="mb-7 flex items-start justify-between gap-4 border-b border-border pb-4">
            <div>
              <p className="meta">RSVP</p>
              <h2 className="display mt-2 text-display-md">{event.title}</h2>
              <p className="meta mt-2">
                {longDate(event.date)} · {event.time} · {priceLabel(event.price)}
              </p>
            </div>
            <DialogClose onClose={onClose} />
          </div>

          <form onSubmit={handleSubmit} noValidate>
            <Field
              id="rsvp-name"
              label="Name"
              value={values.name}
              error={errors.name}
              autoComplete="name"
              onChange={(value) => update('name', value)}
            />
            <Field
              id="rsvp-email"
              label="Email"
              type="email"
              inputMode="email"
              value={values.email}
              error={errors.email}
              autoComplete="email"
              onChange={(value) => update('email', value)}
            />
            <Field
              id="rsvp-whatsapp"
              label="WhatsApp number"
              type="tel"
              inputMode="tel"
              placeholder="+91"
              value={values.whatsapp}
              error={errors.whatsapp}
              autoComplete="tel"
              onChange={(value) => update('whatsapp', value)}
            />
            <Field
              id="rsvp-instagram"
              label="Instagram handle (optional)"
              placeholder="@"
              value={values.instagram}
              onChange={(value) => update('instagram', value)}
            />

            <div className="mb-5">
              <label className="field-label" htmlFor="rsvp-experience">
                Photography experience
              </label>
              <select
                id="rsvp-experience"
                className="field-input"
                value={values.experience}
                onChange={(e) => update('experience', e.target.value as ExperienceLevel)}
              >
                {experienceLevels.map((level) => (
                  <option key={level} value={level}>
                    {level}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex cursor-pointer items-start gap-3 text-sm text-foreground-soft">
              <input
                type="checkbox"
                className="mt-1 h-[15px] w-[15px] flex-none accent-accent"
                checked={values.consent}
                onChange={(e) => update('consent', e.target.checked)}
              />
              <span>I agree to receive event updates from Photowalks in Pune.</span>
            </label>

            {status === 'failed' && (
              <p className="mt-4 font-mono text-micro uppercase text-accent" role="alert">
                {failure}
              </p>
            )}

            <button
              type="submit"
              disabled={status === 'submitting'}
              aria-busy={status === 'submitting'}
              className="cta-solid mt-7 w-full justify-between disabled:opacity-60"
            >
              {status === 'submitting' ? 'Confirming' : 'Confirm my spot'}{' '}
              <span aria-hidden="true">→</span>
            </button>

            <p className="meta mt-4">
              {isBackendConfigured()
                ? 'We only use this to send you walk details.'
                : 'Preview build — submissions are not stored on a server yet.'}
            </p>
          </form>
        </>
      )}
    </Dialog>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
  error,
  type = 'text',
  inputMode,
  placeholder,
  autoComplete,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  type?: string;
  inputMode?: 'text' | 'email' | 'tel';
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <div className="mb-5">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <input
        id={id}
        className="field-input"
        type={type}
        inputMode={inputMode}
        placeholder={placeholder}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      {error && (
        <span
          id={`${id}-error`}
          role="alert"
          className="mt-1.5 block font-mono text-micro uppercase text-accent"
        >
          {error}
        </span>
      )}
    </div>
  );
}
