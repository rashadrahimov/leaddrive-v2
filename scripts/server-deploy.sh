#!/bin/bash
# ═══════════════════════════════════════════════════════════
# LeadDrive CRM v2 — Server-Side Deploy with Rollback
# Called by GitHub Actions. NOT for manual use.
# ═══════════════════════════════════════════════════════════
set -euo pipefail

APP_DIR="/opt/leaddrive-v2"
DEPLOY_TAR="/tmp/leaddrive-deploy.tar.gz"
BACKUP_DIR="/opt/leaddrive-v2-backups"
HEALTH_URL="http://localhost:3001"
PM2_PROCESS="leaddrive-v2"
MAX_BACKUPS=5

log() { echo "[$(date '+%H:%M:%S')] $1"; }

# ── Step 1: Backup current deployment ──────────────────────
log "Creating backup..."
mkdir -p "$BACKUP_DIR"
TIMESTAMP=$(date '+%Y%m%d-%H%M%S')
BACKUP_PATH="$BACKUP_DIR/backup-$TIMESTAMP"
mkdir -p "$BACKUP_PATH"

if [ -d "$APP_DIR/.next/standalone" ]; then
  cp -r "$APP_DIR/.next/standalone" "$BACKUP_PATH/standalone"
  log "Backed up to $BACKUP_PATH"
else
  log "No existing standalone directory (first deploy)"
fi

# ── Step 2: Extract new build ──────────────────────────────
log "Extracting new build..."
rm -rf "$APP_DIR/.next/standalone"
mkdir -p "$APP_DIR/.next/standalone"
tar -xzf "$DEPLOY_TAR" -C "$APP_DIR/.next/standalone"

# Verify extraction
test -f "$APP_DIR/.next/standalone/server.js" || { log "FATAL: server.js missing after extract"; exit 1; }
test -d "$APP_DIR/.next/standalone/.next/static" || { log "FATAL: .next/static missing after extract"; exit 1; }

CSS_COUNT=$(find "$APP_DIR/.next/standalone/.next/static" -name '*.css' | wc -l)
JS_COUNT=$(find "$APP_DIR/.next/standalone/.next/static" -name '*.js' | wc -l)
log "Verified: $CSS_COUNT CSS, $JS_COUNT JS files"
[ "$CSS_COUNT" -gt 0 ] || { log "FATAL: No CSS files"; exit 1; }
[ "$JS_COUNT" -gt 0 ] || { log "FATAL: No JS files"; exit 1; }

# ── Step 3: Prisma migrate deploy ──────────────────────────
log "Running Prisma migrations..."
cd "$APP_DIR"

# Source .env for DATABASE_URL
set -a
source "$APP_DIR/.env" 2>/dev/null || true
set +a

npx prisma migrate deploy 2>&1 || {
  log "WARNING: prisma migrate returned non-zero (may be OK if no pending migrations)"
}

# ── Step 4: Copy ecosystem config ──────────────────────────
log "Updating PM2 config..."
cp "$APP_DIR/.next/standalone/ecosystem.config.cjs" "$APP_DIR/ecosystem.config.cjs" 2>/dev/null || true

# ── Step 5: Restart PM2 ───────────────────────────────────
log "Restarting PM2..."
cd "$APP_DIR"
pm2 restart ecosystem.config.cjs --update-env 2>/dev/null || \
  pm2 start ecosystem.config.cjs 2>/dev/null || {
    log "FATAL: PM2 start/restart failed"
    exit 1
  }

# ── Step 6: Health check (3 retries) ──────────────────────
log "Health check (waiting for startup)..."
sleep 5

HEALTHY=false
for i in 1 2 3; do
  log "Health check attempt $i/3..."
  HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$HEALTH_URL" 2>/dev/null || echo "000")

  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "307" ]; then
    # Page responds — now verify CSS actually loads
    CSS_URL=$(curl -s --max-time 10 "$HEALTH_URL/login" 2>/dev/null | grep -o '/_next/static/[^"]*\.css' | head -1)

    if [ -n "$CSS_URL" ]; then
      CSS_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "${HEALTH_URL}${CSS_URL}" 2>/dev/null || echo "000")
      if [ "$CSS_CODE" = "200" ]; then
        HEALTHY=true
        log "PASSED (page: $HTTP_CODE, CSS: $CSS_CODE)"
        break
      fi
      log "CSS returned $CSS_CODE (expected 200)"
    else
      log "No CSS URL found in page HTML"
    fi
  else
    log "Page returned $HTTP_CODE (expected 200 or 307)"
  fi

  [ "$i" -lt 3 ] && sleep 5
done

# ── Step 7: Rollback if unhealthy ──────────────────────────
if [ "$HEALTHY" = false ]; then
  log "HEALTH CHECK FAILED — initiating rollback!"

  if [ -d "$BACKUP_PATH/standalone" ]; then
    rm -rf "$APP_DIR/.next/standalone"
    cp -r "$BACKUP_PATH/standalone" "$APP_DIR/.next/standalone"
    pm2 restart "$PM2_PROCESS" 2>/dev/null || true
    sleep 5

    ROLLBACK_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$HEALTH_URL" 2>/dev/null || echo "000")
    log "Rollback health check: $ROLLBACK_CODE"
    log "ROLLED BACK to previous version. Deploy FAILED."
    exit 1
  else
    log "No backup available for rollback!"
    exit 1
  fi
fi

# ── Step 8: Cleanup ───────────────────────────────────────
log "Cleaning up..."
cd "$BACKUP_DIR"
ls -dt backup-* 2>/dev/null | tail -n +$((MAX_BACKUPS + 1)) | xargs rm -rf 2>/dev/null || true
rm -f "$DEPLOY_TAR" /tmp/server-deploy.sh

log "Deploy complete! App running on $HEALTH_URL"
