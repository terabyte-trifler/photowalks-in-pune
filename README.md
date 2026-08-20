# Photowalks in Pune

One page. Next.js 15 (App Router) · TypeScript · Tailwind CSS · Framer Motion.
Statically prerendered, no backend required to run.

```bash
npm install
cp .env.example .env.local     # optional — the public site works without it
npm run dev                    # http://localhost:3000
npm run build && npm start
npm run typecheck              # tsc --noEmit, strict, zero errors
```

Accounts need a Supabase project — two environment variables and one SQL file.
See **[supabase/README.md](supabase/README.md)**. Without them the site is
exactly what it was: every public page renders, and the login and join screens
say plainly that accounts are not connected.

Deploys to Vercel with no configuration.

---

## Structure

```
app/
  layout.tsx          Fonts, metadata, viewport, structured data, AuthProvider
  page.tsx            The homepage — composition only
  globals.css         Design tokens + editorial primitives
  icon.svg            Favicon
  not-found.tsx       404
  (auth)/             login · signup · forgot-password · reset-password
  (site)/             profile · settings · my-walks · photographers/[username]
  auth/callback/      OAuth + email-link exchange (route handler)

components/
  navigation/         SiteHeader · MobileMenu · AnnouncementBar · ContactSheetRail
  hero/               Hero · HeroImage
  events/             FeaturedWalk · UpcomingWalks · StickyRSVP
  gallery/            PhotoGallery · GalleryFilter · PhotoGrid · PhotoLightbox
                      · GalleryProvider
  community/          CommunityStatement · CommunitySection · PuneCategories
                      · CategoryButton · InstagramSection
  stories/            PhotoStory · StoryDialog
  newsletter/         Newsletter
  footer/             SiteFooter
  rsvp/               RSVPProvider · RSVPButton · RSVPModal
  auth/               AuthProvider (useAuth) · AuthShell · AuthField
                      · AuthNotice · GoogleButton · useAuthGate
  ui/                 Dialog · Reveal · Typography

data/
  site.ts             SiteConfig, links, SEO, section order, nav
  events.ts           Event type, featuredWalk, upcomingWalks
  photos.ts           Photo, Photographer, Story, categories
  community.ts        CommunityStats, Instagram posts

lib/
  utils.ts            cn(), date/price/capacity formatting, joined date, initials
  rsvp.ts             Mock submission — Supabase swap point
  newsletter.ts       Provider swap point
  instagram.ts        Graph API swap point
  profiles.ts         Profile reads
  supabase/           client (browser) · server · middleware · config · types
  auth/               session (server) · validation · errors · redirects

middleware.ts         Session refresh on every request
supabase/migrations/  profiles table, trigger, RLS

public/images/        hero · walks · gallery · stories · instagram · logo
```

### Server vs client

`app/page.tsx` is a Server Component. Both providers are client components but
receive their children as already-rendered server output, so the JavaScript
boundary stays small:

| Client | Why |
|---|---|
| `SiteHeader`, `MobileMenu` | scroll state, menu |
| `ContactSheetRail` | IntersectionObserver |
| `RSVPProvider`, `RSVPButton`, `RSVPModal` | shared modal state |
| `GalleryProvider`, `GalleryFilter`, `PhotoGrid`, `PhotoLightbox` | filtering |
| `StoryDialog`, `Newsletter`, `StickyRSVP` | forms, dialogs |
| `Reveal`, `HeroImage` | Framer Motion |

Everything else — hero, featured walk, walks index, statement, gallery shell,
story, categories, community, Instagram, footer — is server-rendered.

---

## Where to change things

| What | Where |
|---|---|
| Next walk | `data/events.ts` → `featuredWalk` |
| Upcoming walks | `data/events.ts` → `upcomingWalks` |
| WhatsApp URL | `data/site.ts` → `site.links.whatsapp` |
| Instagram URL | `data/site.ts` → `site.links.instagram` |
| Community stats | `data/community.ts` |
| Gallery photographs | `data/photos.ts` |
| Photographer credits | `data/photos.ts` → `photographers`, then set `photographerId` |
| Story | `data/photos.ts` → `featuredStory` |
| SEO | `data/site.ts` → `site.seo` |
| Images | `public/images/` — see the README in that folder |

Set the ISO `date` on a walk and every display string is derived
(`lib/utils.ts`). `capacity` is the ceiling you set; how many spots are left is
not stored anywhere — `lib/walks.ts` counts the real RSVPs at render time, so
the "N spots left" warning turns orange because a walk is genuinely filling up
rather than because somebody typed a small number.

---

## Three things that are deliberately incomplete

**No invented credits.** `photographers` is empty and every photo has
`photographerId: null`, which renders as UNCREDITED. Add real people first.

**No invented statistics.** `communityStats.walks` and `.years` are `"XX"`.

**No invented structured data.** Event schema is only emitted for a walk with
`verified: true`. Every walk in `data/events.ts` is sample data, so the page
currently publishes Organization schema only. Flip `verified` once the date,
time, meeting point and cost are confirmed.

Related: the newsletter is still local-only. `lib/newsletter.ts` writes to
`localStorage` and the success state says so plainly, until
`NEXT_PUBLIC_NEWSLETTER_ENDPOINT` is set. RSVPs are no longer in that category —
they go to `walk_rsvps` (see **Joining a walk** below).

---

## Accounts

Supabase Auth for credentials, Supabase Postgres for profiles. Setup — project,
migration, Google OAuth — is in **[supabase/README.md](supabase/README.md)**.

| Route | What it is |
|---|---|
| `/signup` | Full name, email, password, confirm, or Google |
| `/login` | Email and password, or Google |
| `/forgot-password` | Sends the reset email |
| `/reset-password` | Where that email lands, after `/auth/callback` |
| `/photographers` | The directory: search, filters, pagination |
| `/photographers/[username]` | Public profile |
| `/photographers/[username]/photos` | Everything they have uploaded |
| `/profile` | Redirects to your own public profile |
| `/settings` | Edit your profile |
| `/my-walks` | The walks you have joined, still-to-come and walked |
| `/auth/callback` | Exchanges an OAuth code or an email token for a session |

### Reading the auth state

```tsx
const { user, profile, loading, signIn, signUp, signOut } = useAuth();
```

Three states, and the header renders all three: `loading` (a placeholder the
same size as what replaces it, so nothing jumps), signed out (Log in · Join),
signed in (avatar → Profile · My walks · Settings · Log out). The provider sits
in the root layout and wraps server children, exactly like `RSVPProvider` does
on the homepage — so the homepage is still statically prerendered and only the
header ships the code.

Sessions live in cookies, not `localStorage`, which is what lets `middleware.ts`
refresh them and lets server components read them. `onAuthStateChange` keeps the
header honest without a reload, in this tab and in any other one.

### What needs an account, and what does not

Nothing public moved behind a login. The homepage, the walks, the archive, the
community and every profile are open, and the middleware only guards
`/settings`, `/profile` and `/my-walks`.

Actions are the part that will need an identity — RSVP, upload, like, comment,
save, join a group, enter a challenge, host a walk. The seam for that is one
hook:

```tsx
const gate = useAuthGate();
if (!gate('to hold your spot')) return;   // sends them to /login, and back again
```

The server action behind such a thing still calls `requireUser()`. The hook is
about not wasting somebody's time; it is not the security control.

### Joining a walk

Browsing is open to everyone. Joining is not — a spot belongs to somebody we can
reach on the morning of the walk, so the RSVP dialog asks for an account first.

All six places that start an RSVP (hero, header, featured walk, walks list,
mobile menu, sticky mobile bar) go through one `open()`, so the gate lives in
the dialog and none of those six knows about it. It asks rather than redirects:
throwing somebody to `/login` the moment they press the primary action loses
both their place on the page and which walk they meant. The links carry
`next=/?rsvp=<slug>`, and `RSVPProvider` reopens the dialog on that walk when
they come back.

Because there is an account, the form arrives with name, email and Instagram
already filled from the profile; only the WhatsApp number and experience level
are actually asked for.

Rows go to `walk_rsvps`, one per member per walk (`unique (profile_id,
event_id)`), so joining twice is not an error — the dialog opens on "Already
in". RSVPs are private: members read, create and cancel only their own, and
`anon` is granted nothing at all. There is no UPDATE policy; changing your mind
means cancelling and rejoining, which keeps `created_at` honest.

`/my-walks` splits them into still-to-come and walked, by the walk's date in
Pune. Cancelling is offered only on walks that have not happened.

Walks themselves still live in `data/events.ts` — they are edited by hand a few
times a month and a table would be ceremony for four rows. `event_id` is a text
key into that file, with the title and date copied onto the RSVP so the page
stands alone and a past RSVP still reads correctly after the file is edited.

### Photographers

`/photographers` is the directory and `/photographers/[username]` the public
profile. Both are open to everyone; only the owner sees an edit control.

Search is debounced by 300ms and lives in the URL rather than in component
state, so `/photographers?style=film` is a link somebody can send and the back
button behaves. It matches name, username, city and — the part that matters —
photography style, so searching "street" finds people who shoot street rather
than people called Street. Filters are style, city and four orderings; when an
ordering has no data behind it the page says so instead of presenting ties as a
ranking.

Interests are **photography styles** (`data/photography.ts`), deliberately a
different vocabulary from the archive's Pune subjects in `data/photos.ts`.
Those describe what a photograph is of and filter the gallery; these describe
how somebody works and sit on a person. Two photographers can both shoot
Mandai, one on a phone and one on film.

Profiles connect back to walks. A profile lists the walks it has been on, each
linking to that walk's RSVP, and ends with everybody else who was on them —
which is the edge that makes this a network rather than a list.

### Leaving

`/settings` ends with account deletion. It removes the auth user, which
cascades the profile, the photographs and the walk RSVPs, and clears both
storage folders — no soft delete, no hidden copy, nothing kept as a backup.

It is the only irreversible action on the site, so it is the only one that
asks you to type your username rather than press twice.

The work happens in the `delete-account` Edge Function. Removing a row from
`auth.users` needs the service-role key, and that key bypasses Row Level
Security for the whole project — putting it in this app's environment would
mean every server action runs beside a key that can read and write anything,
to buy one feature. In the function it is injected by Supabase, scoped to one
job. The function reads who is asking from their own JWT and takes no
parameter for whose account to delete, so the only account anybody can remove
is their own.

### Where this runs

`vercel.json` pins functions to **bom1 (Mumbai)**, because the Supabase project
is in `ap-south-1` and Vercel otherwise defaults to `iad1` (Washington). That
default meant every query on a dynamic page crossed the Atlantic and came back:
the directory took ~900ms to first byte against ~70ms for the static homepage,
and `x-vercel-id: bom1::iad1::…` gave it away — entering the network in Mumbai,
executing in Washington.

If the database ever moves, move this with it. Compute belongs next to the
data it waits on.

### Photographs and storage

`photos` holds what members upload; the files live in Supabase Storage under
`photos/<uid>/…` and `avatars/<uid>/…`. Only the path is stored, so the project
can move buckets or put a CDN in front without rewriting rows.

Storage policies key on the uid folder — `(storage.foldername(name))[1] =
auth.uid()::text` — so a member cannot write into, overwrite or delete anything
in somebody else's folder, and the buckets themselves reject the wrong MIME
type and anything oversized. The checks in `lib/uploads.ts` exist so a 40MB RAW
file is refused instantly rather than after a long upload; they are a courtesy,
not the guard.

### Two public views

`walk_rsvps` is owner-only because it holds a phone number, which makes "how
many walks has this person been on" unanswerable from a public page. Migration
0003 adds two read-only views with fixed column lists:

| View | What it exposes |
|---|---|
| `walk_attendance` | who walked which walk, and when — never contact details |
| `photographer_cards` | public profile columns plus walk and photograph counts |

Both run with their owner's privileges rather than the caller's, which is what
lets them see past the row policy on `walk_rsvps`. That is safe precisely
because the column list is fixed: there is no way to ask either view for a
private column. Do not add columns to them without re-reading that reasoning.

### Profiles

One row per auth user, created by the `on_auth_user_created` trigger in
`supabase/migrations/` — never by application code. That is deliberate: a Google
sign-up has no form to run code in, so a trigger is the only path both sign-up
routes share, and doing it in both places is how you get duplicates.

The username is minted from the name. "Gurnoor Singh" becomes `gurnoor`, then
`gurnoorsingh` if that is taken, then `gurnoor1`, `gurnoor2`. Uniqueness is a
database constraint, not a lookup, and the trigger retries on collision.

Row Level Security: anyone may read a profile, only its owner may write one, and
`id` and `created_at` are revoked from `authenticated` entirely. `profiles` holds
nothing private — no email, no phone, no tokens — which is what makes a
world-readable policy safe. Keep it that way.

---

## Connecting a backend

**Supabase (RSVPs).** `lib/rsvp.ts` contains the table DDL, the RLS policy and
the exact insert call in a comment block. The UI only knows `submitRsvp()` and
`isBackendConfigured()`, so this is a one-file change. Note that
`isBackendConfigured()` no longer keys off `NEXT_PUBLIC_SUPABASE_URL` — that
variable now means "accounts are on", which says nothing about RSVPs. It stays
`false`, and the confirmation screen keeps telling people the truth, until the
`rsvps` table exists and the swap point is filled in.

**Newsletter.** Set `NEXT_PUBLIC_NEWSLETTER_ENDPOINT` to anything accepting
`POST { email }`. The local fallback switches off by itself.

**Instagram.** Set `INSTAGRAM_ACCESS_TOKEN` and the Instagram section becomes
the account's six most recent posts, cached for an hour; without it the section
shows local placeholders and says so on the page. The account must be a
Business or Creator account — full steps are at the top of `lib/instagram.ts`.
Tokens last 60 days; `refreshInstagramToken()` extends one by another 60.

Two different things, deliberately:

| | Source | Why |
|---|---|---|
| Instagram section | live, through the API | "what we posted lately" should be current |
| The archive | the site's own copies | it must not break when a post is deleted or a CDN URL rotates |

`scripts/import-instagram.mjs` fills the second from the first: it downloads
the account's posts, resizes them for the archive, and prints ready-made
entries for `data/photos.ts`.

```bash
INSTAGRAM_ACCESS_TOKEN=... node scripts/import-instagram.mjs --dry-run
```

It leaves `location`, `event` and `photographerId` as TODO rather than
guessing them. Which walk a photograph came from and who made it are things
only a person knows, and a wrong credit is worse than no credit.

**Future routes.** `/walks`, `/walks/[slug]`, `/stories`, `/gallery`,
`/community` can each lift a component out of `page.tsx` unchanged. `Event`
already carries a `slug`.

---

## Design system

| Token | Value |
|---|---|
| `--background` | `#F2EFE9` warm photographic paper |
| `--foreground` | `#16130F` near-black, warm |
| `--foreground-soft` | `#45403A` |
| `--muted` | `#857C70` |
| `--border` | `#D6CFC2` |
| `--accent` | `#C56A1B` Pune orange |

Every Tailwind colour resolves to one of these variables, so
`CommunityStatement` inverts the whole palette by adding `.on-night` — no
`dark:` variants anywhere.

Type: **Instrument Serif** (display, uppercase, set large) · **Archivo** (body,
interface) · **DM Mono** (metadata, frame markings, buttons). One display face,
one sans, one mono. The scale is fluid `clamp()` in `tailwind.config.ts`, so
there are no orphan breakpoints between 375px and 1920px.

The motif is the contact sheet: hairline rules, zero border radius, frame
numbers down the left edge tracking your position, and a rebate strip of
metadata under each photograph. Orange appears in four places only — section
indices, the low-spots warning, the active filter underline, and hover.

---

## Motion

Framer Motion, used five times: section reveal (`Reveal`), the hero
photograph's single entrance, dialog transitions, gallery filter crossfade, and
the sticky mobile CTA. No parallax and no scroll-linked transforms. Every one
checks `useReducedMotion()` and renders a plain element when reduced motion is
requested — nothing is left invisible.

---

## Accessibility

Semantic landmarks and heading order, skip link, visible focus rings, dialogs
that trap focus and close on Escape and return focus to the trigger, arrow-key
lightbox navigation, `aria-pressed` filters, `aria-busy` on submitting buttons,
`role="alert"` on errors, `role="status"` on success, labelled fields, and
buttons rather than clickable divs throughout.
