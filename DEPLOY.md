# Deploying pwip.in

The site runs on a Hostinger VPS: nginx terminates TLS on 443 and proxies to a
standalone Next server on 127.0.0.1:3000, kept alive by PM2. Supabase stays
exactly where it is — it was never part of the hosting, only of the app.

It used to run on Vercel, at `photowalks-in-pune-gold.vercel.app`, with no
custom domain attached at all. `photowalksinpune.com` appeared throughout the
code but was never registered; anything that read it — canonical URLs, Open
Graph, the profile-link hint in Settings — was pointing at nothing. `pwip.in`
replaces it, and this time it is a domain that exists.

---

## What is in `deploy/`

| File | Runs where | Does what |
| --- | --- | --- |
| `provision.sh` | VPS, as root, once | Node 24, nginx, PM2, certbot, ufw, swap, the unprivileged `pwip` user |
| `deploy.sh` | VPS, as `pwip`, every release | Pull, `npm ci`, build, assemble the standalone bundle, reload PM2, smoke-test |
| `ecosystem.config.cjs` | Read by PM2 | Process definition — fork mode, loopback-bound, memory ceiling |
| `nginx/pwip.in.conf` | `/etc/nginx/sites-available/` | www→apex redirect, static assets from disk, proxy, gzip |

---

## First deploy, in order

Steps 1–3 can happen before DNS moves. Step 4 onwards is the cutover, and
after step 5 the old domain is irrelevant.

### 1. Provision the box

```sh
ssh root@<vps-ip> 'bash -s' < deploy/provision.sh
```

Re-runnable. It ends by telling you what it did not do.

### 2. Clone and configure

```sh
ssh pwip@<vps-ip>
git clone https://github.com/terabyte-trifler/photowalks-in-pune.git ~/pwip
mkdir -p ~/logs
```

Then, from your laptop, send the environment file — it is not in git and the
build is wrong without it, because `NEXT_PUBLIC_*` values are compiled into the
browser bundle rather than read at runtime:

```sh
scp .env.production pwip@<vps-ip>:~/pwip/.env.production
ssh pwip@<vps-ip> 'chmod 600 ~/pwip/.env.production'
```

### 3. Build and start

```sh
ssh pwip@<vps-ip> 'cd ~/pwip && ./deploy/deploy.sh'
```

It exits non-zero unless `127.0.0.1:3000` answers 200, so a green run means the
app is actually up, not merely that PM2 accepted it.

### 4. Point the domain at the box

In hPanel → **Domains → pwip.in → DNS / Nameservers**. The domain is on
Hostinger's parking nameservers (`solar`/`lunar.dns-parking.com`) pointing at
`2.57.91.91`, which is a placeholder page, not your VPS.

Delete the parking records and set:

| Type | Name | Points to | TTL |
| --- | --- | --- | --- |
| A | `@` | `<vps-ip>` | 300 |
| A | `www` | `<vps-ip>` | 300 |

Keep TTL at 300 until everything is verified, then raise it to 3600.

Wait for it to actually resolve before step 5 — certbot proves control of the
domain over HTTP, so it fails, loudly and confusingly, against a stale record:

```sh
dig +short A pwip.in @1.1.1.1     # expect <vps-ip>
dig +short A www.pwip.in @1.1.1.1
```

### 5. nginx and TLS

```sh
ssh root@<vps-ip>
cp /home/pwip/pwip/deploy/nginx/pwip.in.conf /etc/nginx/sites-available/pwip.in
ln -sf /etc/nginx/sites-available/pwip.in /etc/nginx/sites-enabled/pwip.in
rm -f /etc/nginx/sites-enabled/default        # its catch-all would win on port 80
nginx -t && systemctl reload nginx
certbot --nginx -d pwip.in -d www.pwip.in --redirect --agree-tos -m hello@pwip.in
```

Certbot edits the site file in place to add the 443 listeners and its own
port-80 redirect, and installs a renewal timer. Confirm the timer exists —
a certificate that quietly stops renewing takes the site down 90 days later:

```sh
systemctl list-timers | grep certbot
certbot renew --dry-run
```

### 6. Tell Supabase about the new origin

Two fields, in **Authentication → URL Configuration**. Nothing else in the
project changes.

- **Site URL**: `https://photowalks-in-pune-gold.vercel.app` → `https://pwip.in`
- **Redirect URLs**: currently
  `https://photowalks-in-pune-gold.vercel.app/auth/callback**`,
  `http://localhost:3000/auth/callback**`,
  `http://localhost:3100/auth/callback**`.
  Add `https://pwip.in/auth/callback**` and
  `https://www.pwip.in/auth/callback**`; remove the Vercel entry once the
  project is gone.

Do not run `supabase config push` to achieve this. `config.toml` in this repo
declares only `[auth.external.apple]` while the live project has Google sign-in
enabled, so a whole-config push would turn Google sign-in off. Use the
dashboard, or PATCH the two fields individually:

```sh
curl -X PATCH "https://api.supabase.com/v1/projects/gcyweszlvjkguvbzfwlj/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "site_url": "https://pwip.in",
    "uri_allow_list": "https://pwip.in/auth/callback**,https://www.pwip.in/auth/callback**,http://localhost:3000/auth/callback**,http://localhost:3100/auth/callback**"
  }'
```

### 7. Redeploy the delete-account edge function

Its CORS allow-list is compiled into the function, and this move rewrote it
from the Vercel origins to `pwip.in`. Until it is redeployed, "delete my
account" from the live site is refused by the browser:

```sh
supabase functions deploy delete-account --project-ref gcyweszlvjkguvbzfwlj
```

### 8. Google sign-in

The OAuth **redirect URI** stays `https://gcyweszlvjkguvbzfwlj.supabase.co/auth/v1/callback`
— it points at Supabase, not at the site, so the move does not touch it. Only
**Authorized JavaScript origins** in the Google Cloud console mentions the site
directly: add `https://pwip.in` there and drop the Vercel origin.

---

## Verify before deleting anything

```sh
curl -sI https://pwip.in | head -20                 # 200, and HSTS present
curl -sI https://www.pwip.in | head -5              # 308 to https://pwip.in
curl -s https://pwip.in | grep -o 'https://pwip.in[^"]*' | head   # canonical/OG
```

Then, in a browser: sign in with Google, open Settings and check the username
hint reads `pwip.in/photographers/…`, open a walk, open a photograph in the
lightbox (that exercises the image optimiser and `sharp` on the server), and
send a password-reset mail.

Password reset is expected to be slow and rate-limited to 2/hour: this Supabase
project has no custom SMTP, which also means the branded templates in
`supabase/templates/` stay dormant and the From line reads
`Supabase Auth <noreply@mail.app.supabase.io>`. That is unchanged by the move
and is fixed by adding SMTP, not by anything here.

## Then retire Vercel

Only after the checks above pass:

```sh
vercel project rm photowalks-in-pune
```

The GitHub repository is unaffected — removing the Vercel project only removes
the deploy hook. Nothing else on the box depends on it.

---

## Routine release

```sh
ssh pwip@<vps-ip> 'cd ~/pwip && ./deploy/deploy.sh'
```

`pm2 reload` swaps the process without dropping connections. To watch it:

```sh
pm2 logs pwip --lines 50
pm2 status
```

## When something is wrong

| Symptom | Where to look |
| --- | --- |
| 502 from nginx | The node process is down: `pm2 status`, `pm2 logs pwip` |
| Page loads unstyled, no photographs | `.next/static` or `public` missing from `.next/standalone` — deploy.sh copies both; check it ran to completion |
| Sign-in redirects to the Vercel URL | Supabase Site URL still points there (step 6) |
| Sign-in returns "redirect not allowed" | `pwip.in/auth/callback**` missing from the allow-list (step 6) |
| Images 500 on first load | `sharp` — it must be the Linux build, which is why deploy.sh builds on the server rather than shipping a laptop build |
| Build killed with no error | Out of memory. `provision.sh` adds 2G of swap; confirm with `swapon --show` |
| Certificate expired | `systemctl list-timers \| grep certbot`, then `certbot renew` |
