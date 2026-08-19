'use client';

import { useId, useState } from 'react';

/* The site's fields are underlines, not boxes (.field-label / .field-input in
   globals.css). This is the RSVP modal's Field with two additions the account
   screens need: a password reveal and an optional hint line. */

export function AuthField({
  label,
  value,
  onChange,
  error,
  hint,
  type = 'text',
  inputMode,
  placeholder,
  autoComplete,
  autoFocus,
  disabled,
  maxLength,
  id: providedId,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  type?: 'text' | 'email' | 'password';
  inputMode?: 'text' | 'email';
  placeholder?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  maxLength?: number;
  id?: string;
}) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const [revealed, setRevealed] = useState(false);

  const isPassword = type === 'password';
  const described = [error ? `${id}-error` : null, hint && !error ? `${id}-hint` : null]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="mb-6">
      <div className="flex items-baseline justify-between gap-4">
        <label className="field-label" htmlFor={id}>
          {label}
        </label>

        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((current) => !current)}
            className="mb-2 font-mono text-micro uppercase text-muted transition-colors hover:text-accent"
            aria-pressed={revealed}
            aria-controls={id}
          >
            {revealed ? 'Hide' : 'Show'}
          </button>
        )}
      </div>

      <input
        id={id}
        className="field-input disabled:opacity-50"
        type={isPassword && revealed ? 'text' : type}
        inputMode={inputMode}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        disabled={disabled}
        maxLength={maxLength}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={described || undefined}
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
          <span id={`${id}-hint`} className="mt-2 block font-mono text-micro uppercase text-muted">
            {hint}
          </span>
        )
      )}
    </div>
  );
}
