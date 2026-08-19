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
click in **Storage**. Check it worked: **Storage** should list `avatars`
(2MB limit) and `photos` (10MB), both public, both accepting JPEG, PNG, WebP
and AVIF only. Public means *readable* — writing is limited to the owner by
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

Worth running after deleting anybody from the dashboard, and occasionally
otherwise. On a schedule it belongs in a cron job or a scheduled Edge
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

## What is deliberately not here

**No `service_role` key, and no admin client.** Everything this app does is
something a signed-in person is allowed to do as themselves.

**No profile insert in application code.** The trigger is the only writer, so a
Google sign-up — which has no form to run code in — gets a profile on exactly
the same path an email sign-up does.

**No email or phone number in `profiles`.** That table is world-readable by
design. Private fields belong in `auth.users`, where Supabase keeps them.
