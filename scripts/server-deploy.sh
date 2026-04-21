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

# ── Step 2b: Verify Prisma engine is in the standalone tarball ────
# Next.js traces Prisma as external — if the engine binary didn't make it
# into the tarball, every DB-hitting request will throw
# PrismaClientInitializationError. Copy from the host's node_modules as
# fallback so we never ship a DB-broken build.
PRISMA_ENGINE_PATTERN="$APP_DIR/.next/standalone/node_modules/.prisma/client/libquery_engine-*.so.node"
# shellcheck disable=SC2086
if ! ls $PRISMA_ENGINE_PATTERN 1>/dev/null 2>&1; then
  log "WARNING: Prisma engine missing in extracted tarball — copying from host node_modules"
  mkdir -p "$APP_DIR/.next/standalone/node_modules/.prisma/client"
  mkdir -p "$APP_DIR/.next/standalone/node_modules/@prisma"
  cp -r "$APP_DIR/node_modules/.prisma/client/." "$APP_DIR/.next/standalone/node_modules/.prisma/client/" 2>/dev/null || log "ERROR: host .prisma/client missing too!"
  cp -r "$APP_DIR/node_modules/@prisma/." "$APP_DIR/.next/standalone/node_modules/@prisma/" 2>/dev/null || log "ERROR: host @prisma missing too!"
  # shellcheck disable=SC2086
  ls $PRISMA_ENGINE_PATTERN 1>/dev/null 2>&1 || { log "FATAL: Prisma engine missing and can't be recovered"; exit 1; }
fi
log "Prisma engine verified: $(ls $PRISMA_ENGINE_PATTERN | head -1 | xargs basename)"

# ── Step 3: Prisma migrate deploy ──────────────────────────
log "Running Prisma migrations..."
cd "$APP_DIR"

# Source .env for DATABASE_URL
set -a
source "$APP_DIR/.env" 2>/dev/null || true
set +a

npx prisma migrate deploy --schema="$APP_DIR/prisma/schema.prisma" 2>&1 || {
  log "WARNING: prisma migrate returned non-zero (may be OK if no pending migrations)"
}

# ── Step 4: Copy ecosystem config ──────────────────────────
log "Updating PM2 config..."
cp "$APP_DIR/.next/standalone/ecosystem.config.cjs" "$APP_DIR/ecosystem.config.cjs" 2>/dev/null || true

# ── Step 5: Stop old process, restart PM2 ─────────────────
log "Stopping old processes..."
cd "$APP_DIR"

# Delete existing PM2 process (ignore errors if not found)
pm2 delete "$PM2_PROCESS" 2>/dev/null || true

# Kill ANY process holding port 3001 (orphan from previous deploys)
fuser -k 3001/tcp 2>/dev/null || true
sleep 2

# Double-check port is free
if ss -tlnp | grep -q ":3001 "; then
  log "WARNING: port 3001 still occupied, force killing..."
  fuser -k -9 3001/tcp 2>/dev/null || true
  sleep 2
fi

log "Starting PM2..."
# Source .env so PM2 inherits all environment variables
set -a
source "$APP_DIR/.env" 2>/dev/null || true
set +a

pm2 start ecosystem.config.cjs 2>/dev/null || {
  log "FATAL: PM2 start failed"
  exit 1
}

# Save PM2 state for reboot persistence
pm2 save 2>/dev/null || true

# ── Step 6: Health check (5 retries, longer warmup) ──────
log "Health check (waiting for startup)..."
sleep 15

# Warm up the app — first requests to Next.js 16 standalone can 500
curl -s -o /dev/null --max-time 10 "$HEALTH_URL/login" 2>/dev/null || true
sleep 5

HEALTHY=false
for i in 1 2 3 4 5; do
  log "Health check attempt $i/5..."
  HTTP_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$HEALTH_URL/login" 2>/dev/null || echo "000")

  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "307" ]; then
    # Page responds — now verify CSS actually loads
    CSS_URL=$(curl -s --max-time 10 "$HEALTH_URL/login" 2>/dev/null | grep -o '/_next/static/[^"]*\.css' | head -1)

    if [ -n "$CSS_URL" ]; then
      CSS_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "${HEALTH_URL}${CSS_URL}" 2>/dev/null || echo "000")
      if [ "$CSS_CODE" = "200" ]; then
        # DB-path probe — hits an endpoint that loads Prisma Client. A
        # missing query engine surfaces here as 500; the login/static
        # checks above don't touch Prisma and would pass even on a broken
        # build. Expect 401 (unauth but DB queried) or 200.
        # /api/v1/ping does `prisma.organization.count()` — returns 200 when
        # the query engine loaded successfully, 500 when it's missing/crashed.
        DB_CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$HEALTH_URL/api/v1/ping" 2>/dev/null || echo "000")
        if [ "$DB_CODE" = "200" ]; then
          HEALTHY=true
          log "PASSED (page: $HTTP_CODE, CSS: $CSS_CODE, db: $DB_CODE)"
          break
        fi
        log "DB probe returned $DB_CODE (Prisma engine likely missing — will rollback)"
      else
        log "CSS returned $CSS_CODE (expected 200)"
      fi
    else
      log "No CSS URL found in page HTML"
    fi
  else
    log "Page returned $HTTP_CODE (expected 200 or 307)"
  fi

  [ "$i" -lt 5 ] && sleep 8
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
