# Supabase setup

Everything the account system needs, in the order you need it. Fifteen minutes,
most of it waiting for a project to provision.

The site works with none of this — the homepage, the walks, the archive and the
community are public and render without a Supabase project. The login and join
screens simply say that accounts are not connected yet.

---

## 1 · Create the project

1. [database.new](https://database.new) → new project, region **Mumbai
   (ap-south-1)** so the round trip from Pune is short.
2. **Project Settings → API** gives you two values:

   | Dashboard field | Environment variable |
   |---|---|
   | Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
   | `anon` `public` key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |

3. Put them in `.env.local` (copy `.env.example`).

**Do not copy the `service_role` key anywhere.** It bypasses Row Level
Security. This project never uses it — every read and write goes through the
anon key with RLS in force, which is why there is no `SUPABASE_SERVICE_ROLE_KEY`
in `.env.example`.

---

## 2 · Run the migration

**SQL Editor → New query**, paste each file in `supabase/migrations/` in order
and run it. Both are safe to run more than once.

| Migration | What it adds |
|---|---|
| `20260820000001_profiles.sql` | `profiles`, the username generator, the sign-up trigger, RLS |
| `20260820000002_walk_rsvps.sql` | `walk_rsvps`, one row per member per walk, RLS |
| `20260820000003_photographers.sql` | `website_url`, `photos`, two public views, and the `avatars` / `photos` storage buckets with their policies |

With the CLI instead:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

### Storage

Migration 0003 creates both buckets and their policies, so there is nothing to
click in **Storage**. Check it worked: **Storage** should list `avatars` and
`photos`, both public, both accepting JPEG, PNG, WebP and AVIF only, and both
with a **200 KiB** size limit.

That limit is the one number this whole design turns on, so it is worth
knowing where it comes from: migration 0003 creates the buckets at the sizes a
file picker would suggest, and migration 0005 brings both down to 204800 bytes.
The browser compresses every upload to fit before sending (`prepareImage` in
`lib/uploads.ts`), but that half runs on a client and a client can be replaced
with curl — the bucket limit is the half that holds. At 500 members × 20
photographs it is the difference between about 2GB and about 67GB, and the same
again in egress. Public means *readable* — writing is limited to the owner by
policy, keyed on the uid folder each file sits in.

If you ever recreate a bucket by hand, recreate the policies with it; a public
bucket with no insert policy is writable by nobody, and one with a policy that
omits the folder check is writable by everybody.

Check they landed: **Table Editor** should show `profiles`, `photos` and `walk_rsvps`,
both with **RLS enabled**, and **Authentication → Policies** should list three
policies on each.

One thing worth knowing if you write your own migrations here: a hosted Supabase
project runs `alter default privileges in schema public grant all on tables to
anon, authenticated`, so a newly created table arrives with INSERT, UPDATE and
DELETE already granted to both roles. The local CLI stack does not, so the
difference is invisible until you deploy. Both migrations therefore `revoke all`
before granting what they actually want.

---

## 3 · Email settings

**Authentication → Providers → Email**

| Setting | Value | Why |
|---|---|---|
| Enable email provider | on | |
| Confirm email | your call | On is safer; off is friendlier while testing. The signup screen handles both — with it on, people get a "check your inbox" screen instead of being logged straight in. |
| Minimum password length | 8 | Matches `LIMITS.password.min` in `lib/auth/validation.ts`. |

**Authentication → URL Configuration**

| Field | Value |
|---|---|
| Site URL | `https://your-domain.com` (in development, `http://localhost:3000`) |
| Redirect URLs | `http://localhost:3000/**`, `https://your-domain.com/**`, and `https://*-your-team.vercel.app/**` for previews |

Supabase refuses any redirect not on that allow-list, and a missing entry is
the usual reason a Google sign-in or a reset link lands on an error page.

The default email templates work as they are — they send people to
`/auth/callback?code=…`, which this app handles. If you customise them to use
`{{ .TokenHash }}`, that works too: the same route accepts `token_hash` and
`type`.

> Supabase's built-in email sender is rate-limited to a handful of messages an
> hour and is not meant for production. Before launch, set up a real SMTP
> provider under **Project Settings → Authentication → SMTP Settings**.

---

## 4 · Google sign-in

Two consoles, four values. Nothing is written by hand in this codebase —
`signInWithOAuth` and the callback route do all of it.

### In Google Cloud Console

1. [console.cloud.google.com](https://console.cloud.google.com) → create or pick
   a project.
2. **APIs & Services → OAuth consent screen**: External, app name
   *Photowalks in Pune*, your support email, and the `email`, `profile`,
   `openid` scopes. While it is in *Testing*, only the accounts you list under
   **Test users** can sign in — publish it before launch.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**,
   type **Web application**.
   - **Authorised JavaScript origins**: `http://localhost:3000` and your
     production domain.
   - **Authorised redirect URI** — this one is Supabase's, not yours:

     ```
     https://<project-ref>.supabase.co/auth/v1/callback
     ```

4. Copy the **Client ID** and **Client secret**.

### In Supabase

**Authentication → Providers → Google**: enable it, paste the client ID and
secret, save.

That is the whole integration. The client secret lives in Supabase and never
touches this repository.

The button appears by itself once you do. The app reads `/auth/v1/settings` —
a public endpoint listing which providers are on — so there is no flag to
change and nothing to redeploy. Until Google is enabled the button is not
rendered at all, because a sign-in button that fails when pressed is worse
than no button, and it sits on the screen where people decide whether the site
works.

That answer is cached for five minutes, so allow a few minutes (or a redeploy)
before it shows up.

### Local development

The local stack (`supabase start`) needs the same pair in `supabase/config.toml`:

```toml
[auth.external.google]
enabled = true
client_id = "env(GOOGLE_CLIENT_ID)"
secret = "env(GOOGLE_SECRET)"
```

---

## 5 · Check it works

Sign up with an email, then look at **Table Editor → profiles**. There should be
one row, with a `username` derived from the name you typed — `gurnoor` for
"Gurnoor Singh", `gurnoor1` if that was taken. Nobody wrote that row: the
`on_auth_user_created` trigger did.

To prove RLS is doing its job, run this in the SQL editor as an anonymous
caller:

```sql
set local role anon;
select id, username from public.profiles;              -- allowed: profiles are public
update public.profiles set bio = 'nope' where true;    -- 0 rows: no policy permits it
```

---

---

## When an account is deleted

Deleting an account cascades its rows away, but nothing reaches into a bucket.
Two things close that, in this order:

**Immediately** — an `after delete` trigger on `auth.users` asks the
`purge-user-storage` Edge Function to empty that member's folders. It fires
however the account goes: the dashboard, the admin API, or the app. Measured
at about two seconds from deletion to empty buckets.

It cannot fail a deletion. `pg_net` queues the request and returns, so a slow
or unreachable function cannot hold up or roll back the delete, and the
trigger swallows its own errors on top of that. Losing the files is bad;
refusing to delete somebody's account because a webhook misbehaved is worse.

**Eventually** — the sweep below, which catches anything the call missed.

### Setting it up on a new project

```bash
supabase functions deploy purge-user-storage --no-verify-jwt
supabase secrets set PURGE_SECRET=$(openssl rand -base64 32)
```

Then, once, in the SQL editor — with the same secret:

```sql
select vault.create_secret(
  'https://<project-ref>.supabase.co/functions/v1/purge-user-storage',
  'purge_function_url', 'Endpoint the delete trigger calls');
select vault.create_secret(
  '<the same PURGE_SECRET>',
  'purge_secret', 'Shared secret the function checks');
```

The vault keeps both encrypted at rest and out of every dump and backup, which
a database setting would not. Neither is in version control, and neither is
required — with them absent the trigger does nothing and the sweep is the only
mechanism, which is what makes the migration safe on a fresh project.

The function is deployed with `--no-verify-jwt` because its caller is a
database trigger rather than a signed-in person; the shared secret is what
stands in for that, and it refuses anything without it.

---

## Reclaiming orphaned images

Deleting an account cascades its `photos` rows away, but nothing reaches into
a bucket — there is no foreign key from Postgres to object storage. The files
stay, invisible and still counted against the 1GB allowance.

```bash
SUPABASE_SERVICE_ROLE_KEY=... node scripts/prune-storage.mjs          # report
SUPABASE_SERVICE_ROLE_KEY=... node scripts/prune-storage.mjs --apply  # delete
```

It reports by default and deletes nothing without `--apply`. It removes files
under a uid whose account is gone, and files that no `photos` row or
`profiles.avatar_url` points at — an upload that failed halfway, for instance.

Now mostly a safety net rather than the main mechanism — the trigger above
handles deletions as they happen — but still worth running occasionally, and
after anything unusual. On a schedule it belongs in a cron job or a scheduled Edge
Function, not in the app.

**Why this is not a database trigger.** The obvious fix is a trigger on
`auth.users` that deletes from `storage.objects`, and it is a trap: that table
holds the *metadata*, while the bytes live in S3. Removing the row makes the
file invisible to the Storage API, so nothing can ever list or delete it
again — the bytes are stranded and still billed. The Storage API removes both
halves, which is why this runs outside the database.

The service-role key bypasses Row Level Security. Pass it on the command line
or from a secret store; never put it in `.env.local` beside the
`NEXT_PUBLIC_` variables, and never in a variable that starts with that
prefix.

## Instagram, without the 60-day cliff

Long-lived Instagram tokens expire after 60 days, and refreshing one returns a
*new* string. An environment variable cannot be written to, so a token in
`INSTAGRAM_ACCESS_TOKEN` has to be replaced by hand twice a year — and the grid
quietly shows placeholders from the day it lapses until somebody notices.

Instead the token lives in the vault, and the `instagram-posts` function
rotates it whenever it is more than 30 days old. The app asks that function for
posts and never holds the token at all.

### Setting it up

Migration 0013 adds the two functions this needs. Then, once, in the SQL editor:

```sql
select vault.create_secret(
  '<the long-lived token from Meta>',
  'instagram_token', 'Instagram long-lived token; rotated automatically');
```

Paste it raw. The first rotation rewrites it as JSON carrying the date it was
last refreshed.

```bash
supabase functions deploy instagram-posts
```

Then **remove `INSTAGRAM_ACCESS_TOKEN` from Vercel**. While it is set the app
takes the old direct path and none of this applies — that is the switch.

Getting the token itself is documented at the top of `lib/instagram.ts`; the
account must be Business or Creator.

### How it stays alive

The homepage revalidates hourly, so the function is called at least that often
and checks the token's age every time. Rotating at 30 days leaves a month of
slack before the 60-day deadline, which no site with visitors will miss.

The one gap is a site nobody loads for a month. If that worries you, a weekly
`cron.schedule` calling the function through `pg_net` closes it — the same
mechanism migration 0006 uses, on a schedule instead of a trigger.

### Why not a table and the service-role key

Because a table read with the anon key is readable by everyone, and putting the
service-role key in the Next app would turn any future policy mistake into a
full-database compromise. Edge Functions are handed that key by the platform,
inside Supabase, where it never reaches a bundle or a Vercel environment — so
the rule below still holds exactly as written.

## What is deliberately not here

**No `service_role` key, and no admin client.** Everything this app does is
something a signed-in person is allowed to do as themselves.

**No profile insert in application code.** The trigger is the only writer, so a
Google sign-up — which has no form to run code in — gets a profile on exactly
the same path an email sign-up does.

**No email or phone number in `profiles`.** That table is world-readable by
design. Private fields belong in `auth.users`, where Supabase keeps them.
