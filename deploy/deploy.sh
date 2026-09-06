#!/usr/bin/env bash
# ============================================================================
# DEPLOY — run on the VPS, as the pwip user, from the repository root
#
#     ssh pwip@<vps-ip> 'cd ~/pwip && ./deploy/deploy.sh'
#
# Pulls, builds, and reloads PM2 with zero downtime. The build happens here
# rather than on a laptop on purpose: `sharp` and Next's SWC binary are
# platform-specific, and a macOS build copied to Linux fails at the first
# optimised image with a module-not-found that names no image.
# ============================================================================
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT=$(pwd)
BRANCH=${BRANCH:-main}

log() { printf '\n\033[1;33m==> %s\033[0m\n' "$*"; }

[[ -f .env.production ]] || {
  echo "No .env.production in ${ROOT}." >&2
  echo "NEXT_PUBLIC_* values are compiled into the browser bundle at build" >&2
  echo "time, so the build is wrong without it, not merely unconfigured." >&2
  exit 1
}

log "Fetching ${BRANCH}"
git fetch --prune origin
git checkout "${BRANCH}"
git reset --hard "origin/${BRANCH}"

log "Installing dependencies"
npm ci

log "Building"
npm run build

# ---------------------------------------------------------------------------
# The two directories `output: 'standalone'` leaves behind. See next.config.ts.
# `cp -rT`-style semantics via rsync-free plain cp so this works on a minimal
# box: delete the destination first, then copy, so a removed file in /public
# does not survive as a ghost.
# ---------------------------------------------------------------------------
log "Assembling the standalone bundle"
rm -rf .next/standalone/.next/static .next/standalone/public
mkdir -p .next/standalone/.next
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public

# The standalone server reads .env files from its own working directory, which
# is .next/standalone — not the repository root. Runtime-only variables would
# silently go missing without this.
cp .env.production .next/standalone/.env.production

log "Reloading PM2"
if pm2 describe pwip >/dev/null 2>&1; then
  pm2 reload deploy/ecosystem.config.cjs --update-env
else
  pm2 start deploy/ecosystem.config.cjs
  pm2 save
fi

pm2 status pwip

log "Smoke test"
for i in $(seq 1 15); do
  code=$(curl -s -o /dev/null -w '%{http_code}' -H 'Host: pwip.in' http://127.0.0.1:3000/ || true)
  [[ "$code" == "200" ]] && { echo "127.0.0.1:3000 -> 200"; exit 0; }
  sleep 1
done

echo "The app did not answer 200 on 127.0.0.1:3000 within 15s." >&2
echo "pm2 logs pwip --lines 50" >&2
exit 1
