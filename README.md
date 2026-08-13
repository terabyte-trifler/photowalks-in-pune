# Photowalks in Pune

One page. Next.js 15 (App Router) · TypeScript · Tailwind CSS · Framer Motion.
Statically prerendered, no backend required to run.

```bash
npm install
cp .env.example .env.local     # optional — everything works without it
npm run dev                    # http://localhost:3000
npm run build && npm start
npm run typecheck              # tsc --noEmit, strict, zero errors
```

Deploys to Vercel with no configuration.

---

## Structure

```
app/
  layout.tsx          Fonts, metadata, viewport, structured data
  page.tsx            The homepage — composition only
  globals.css         Design tokens + editorial primitives
  icon.svg            Favicon
  not-found.tsx       The only other route

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
  ui/                 Dialog · Reveal · Typography

data/
  site.ts             SiteConfig, links, SEO, section order, nav
  events.ts           Event type, featuredWalk, upcomingWalks
  photos.ts           Photo, Photographer, Story, categories
  community.ts        CommunityStats, Instagram posts

lib/
  utils.ts            cn(), date/price/capacity formatting
  rsvp.ts             Mock submission — Supabase swap point
  newsletter.ts       Provider swap point
  instagram.ts        Graph API swap point

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
(`lib/utils.ts`). `capacity` and `spotsRemaining` drive the "N spots left"
warning in orange.

---

## Three things that are deliberately incomplete

**No invented credits.** `photographers` is empty and every photo has
`photographerId: null`, which renders as UNCREDITED. Add real people first.

**No invented statistics.** `communityStats.walks` and `.years` are `"XX"`.

**No invented structured data.** Event schema is only emitted for a walk with
`verified: true`. Every walk in `data/events.ts` is sample data, so the page
currently publishes Organization schema only. Flip `verified` once the date,
time, meeting point and cost are confirmed.

Related: nothing is stored on a server yet. The RSVP and newsletter flows are
fully functional — validation, per-field errors, loading state, duplicate-submit
prevention, success state — but `lib/rsvp.ts` writes to `localStorage` and the
confirmation screen says so plainly. That notice disappears on its own once
`isBackendConfigured()` returns true.

---

## Connecting a backend

**Supabase (RSVPs).** `lib/rsvp.ts` contains the table DDL, the RLS policy and
the exact insert call in a comment block. The UI only knows `submitRsvp()` and
`isBackendConfigured()`, so this is a one-file change.

**Newsletter.** Set `NEXT_PUBLIC_NEWSLETTER_ENDPOINT` to anything accepting
`POST { email }`. The local fallback switches off by itself.

**Instagram.** `lib/instagram.ts` has the route handler to copy in, with hourly
revalidation. `InstagramSection` is already an async server component and does
not change.

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
