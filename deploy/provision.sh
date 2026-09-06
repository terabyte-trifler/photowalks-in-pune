#!/usr/bin/env bash
# ============================================================================
# ONE-TIME VPS PROVISIONING — Hostinger, Ubuntu 22.04 / 24.04
# ----------------------------------------------------------------------------
# Run once, as root, on a fresh box:
#
#     ssh root@<vps-ip> 'bash -s' < deploy/provision.sh
#
# It installs Node, nginx, PM2 and certbot, creates the unprivileged user the
# site runs as, and opens the firewall. It does NOT clone the repository or
# issue a certificate — those need DNS pointing here first, and they live in
# DEPLOY.md as steps you run in order.
#
# Safe to re-run: every step checks before it acts.
# ============================================================================
set -euo pipefail

NODE_MAJOR=24
APP_USER=pwip
APP_HOME=/home/${APP_USER}

log() { printf '\n\033[1;33m==> %s\033[0m\n' "$*"; }

[[ $EUID -eq 0 ]] || { echo "Run this as root." >&2; exit 1; }

log "Updating the package index"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq

log "Base packages"
apt-get install -y -qq curl git ca-certificates gnupg ufw nginx

# ---------------------------------------------------------------------------
# Swap. `next build` peaks well above what Hostinger's smaller plans give you,
# and the OOM killer's way of reporting that is to kill node mid-build and
# leave a half-written .next behind. 2G of swap costs disk and nothing else.
# ---------------------------------------------------------------------------
if ! swapon --show | grep -q '/swapfile'; then
  log "Adding 2G of swap"
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
else
  log "Swap already present, leaving it alone"
fi

# ---------------------------------------------------------------------------
# Node. NodeSource rather than the distribution package, which is years behind
# and would not run Next 15.
# ---------------------------------------------------------------------------
if ! command -v node >/dev/null || [[ "$(node -v)" != v${NODE_MAJOR}.* ]]; then
  log "Installing Node ${NODE_MAJOR}"
  install -d -m 0755 /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
    | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_${NODE_MAJOR}.x nodistro main" \
    > /etc/apt/sources.list.d/nodesource.list
  apt-get update -qq
  apt-get install -y -qq nodejs
fi
log "Node $(node -v), npm $(npm -v)"

log "Installing PM2"
npm install -g pm2@latest --silent

# ---------------------------------------------------------------------------
# The site does not need root, and nginx is the only thing that should hold a
# privileged port. Everything below 1024 stays with nginx; node listens on
# 127.0.0.1:3000 as this user.
# ---------------------------------------------------------------------------
if ! id -u ${APP_USER} >/dev/null 2>&1; then
  log "Creating the ${APP_USER} user"
  adduser --disabled-password --gecos '' ${APP_USER}
fi

# Give that user the same SSH key you are logged in with, so deploys do not
# need root.
if [[ -f /root/.ssh/authorized_keys ]]; then
  install -d -m 0700 -o ${APP_USER} -g ${APP_USER} ${APP_HOME}/.ssh
  install -m 0600 -o ${APP_USER} -g ${APP_USER} \
    /root/.ssh/authorized_keys ${APP_HOME}/.ssh/authorized_keys
fi

log "Firewall"
ufw allow OpenSSH >/dev/null
ufw allow 'Nginx Full' >/dev/null
ufw --force enable >/dev/null
ufw status verbose

log "certbot"
apt-get install -y -qq certbot python3-certbot-nginx

# PM2 should come back after a reboot, running as the app user.
log "PM2 startup unit"
env PATH=$PATH:/usr/bin pm2 startup systemd -u ${APP_USER} --hp ${APP_HOME} >/dev/null

cat <<'DONE'

Provisioned. Next, from DEPLOY.md:

  1. Point pwip.in and www.pwip.in at this box in Hostinger DNS.
  2. Clone the repository as the pwip user and write .env.production.
  3. Run deploy/deploy.sh for the first build.
  4. Install the nginx site and issue the certificate.

DONE
