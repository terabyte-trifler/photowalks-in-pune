'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { photographyStyles } from '@/data/photography';
import { SORT_OPTIONS } from '@/lib/directory';
import { cn } from '@/lib/utils';

/* ============================================================================
 * SEARCH AND FILTERS
 * ----------------------------------------------------------------------------
 * The state lives in the URL, not in this component. That keeps the results
 * server-rendered and the query shareable — /photographers?style=film is a
 * link somebody can send — and it means the back button behaves.
 *
 * Typing is debounced by 300ms and the request is skipped entirely when the
 * text has not actually changed, so a keystroke is not a database query.
 * ========================================================================== */

const DEBOUNCE_MS = 300;

export function DirectoryControls({ cities, total }: { cities: string[]; total: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const activeQ = params.get('q') ?? '';
  const activeStyle = params.get('style') ?? '';
  const activeCity = params.get('city') ?? '';
  const activeSort = params.get('sort') ?? 'active';

  const [text, setText] = useState(activeQ);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* A filter chip changing the URL should be reflected in the box. */
  useEffect(() => setText(activeQ), [activeQ]);

  const push = useCallback(
    (changes: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(changes)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      /* Any change to the query resets to the first page. */
      next.delete('page');
      const query = next.toString();
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      });
    },
    [params, pathname, router],
  );

  const onType = (value: string) => {
    setText(value);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      if (value.trim() === activeQ.trim()) return;
      push({ q: value.trim() || null });
    }, DEBOUNCE_MS);
  };

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const hasFilters = Boolean(activeQ || activeStyle || activeCity) || activeSort !== 'active';

  return (
    <div className="border-t border-foreground">
      {/* ---- Search ------------------------------------------------------ */}
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          if (timer.current) clearTimeout(timer.current);
          push({ q: text.trim() || null });
        }}
        className="flex items-center gap-4 border-b border-border py-[clamp(1rem,2vw,1.5rem)]"
      >
        <label htmlFor="photographer-search" className="sr-only">
          Search photographers
        </label>
        <input
          id="photographer-search"
          type="search"
          value={text}
          onChange={(event) => onType(event.target.value)}
          placeholder="Search photographers..."
          autoComplete="off"
          className="w-full appearance-none border-0 bg-transparent py-1 font-display text-[clamp(1.35rem,3.5vw,2.1rem)] leading-tight text-foreground placeholder:text-border-strong focus:outline-none"
        />
        <span
          aria-live="polite"
          className="meta hidden flex-none whitespace-nowrap sm:block"
        >
          {pending ? 'Looking' : `${total} ${total === 1 ? 'photographer' : 'photographers'}`}
        </span>
      </form>

      {/* ---- Filters ----------------------------------------------------- */}
      <div className="grid gap-x-10 gap-y-6 py-[clamp(1.25rem,2.5vw,1.75rem)] lg:grid-cols-[2fr_1fr_1fr]">
        <FilterGroup label="Style">
          <Chip
            label="All"
            active={!activeStyle}
            onClick={() => push({ style: null })}
          />
          {photographyStyles.map((style) => (
            <Chip
              key={style.id}
              label={style.label}
              title={style.note}
              active={activeStyle === style.id}
              onClick={() => push({ style: activeStyle === style.id ? null : style.id })}
            />
          ))}
        </FilterGroup>

        <FilterGroup label="City">
          <Chip label="Everywhere" active={!activeCity} onClick={() => push({ city: null })} />
          {cities.map((city) => (
            <Chip
              key={city}
              label={city}
              active={activeCity.toLowerCase() === city.toLowerCase()}
              onClick={() => push({ city: activeCity === city ? null : city })}
            />
          ))}
        </FilterGroup>

        <FilterGroup label="Sort">
          {SORT_OPTIONS.map((option) => (
            <Chip
              key={option.id}
              label={option.label}
              active={activeSort === option.id}
              onClick={() => push({ sort: option.id === 'active' ? null : option.id })}
            />
          ))}
        </FilterGroup>
      </div>

      {hasFilters && (
        <div className="border-t border-border py-3.5">
          <button
            type="button"
            onClick={() => {
              setText('');
              push({ q: null, style: null, city: null, sort: null });
            }}
            className="font-mono text-micro uppercase text-muted transition-colors hover:text-accent"
          >
            Clear everything ✕
          </button>
        </div>
      )}
    </div>
  );
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="meta mb-3">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({
  label,
  title,
  active,
  onClick,
}: {
  label: string;
  title?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={cn(
        'border px-3 py-1.5 font-mono text-micro uppercase transition-colors',
        active
          ? 'border-foreground bg-foreground text-background'
          : 'border-border-strong text-foreground-soft hover:border-foreground hover:text-foreground',
      )}
    >
      {label}
    </button>
  );
}
