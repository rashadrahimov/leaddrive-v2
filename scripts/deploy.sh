#!/bin/bash
# ═══════════════════════════════════════════════════════════
# LeadDrive CRM v2 — Deploy to Production
# Strategy: push → build on server → restart PM2
# Usage: bash scripts/deploy.sh
# ═══════════════════════════════════════════════════════════
set -e

SERVER="46.224.171.53"
APP_DIR="/opt/leaddrive-v2"
HEALTH_URL="http://localhost:3001"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

step() { echo -e "\n${YELLOW}[$1/5]${NC} $2"; }
ok()   { echo -e "  ${GREEN}✓${NC} $1"; }
fail() { echo -e "  ${RED}✗${NC} $1"; exit 1; }

# ─── Step 1: Pre-flight ───
step 1 "Pre-flight checks..."
if ! git diff --quiet HEAD 2>/dev/null; then
  fail "Uncommitted changes! Commit first."
fi
ok "Clean working tree"

# ─── Step 2: Push to GitHub ───
step 2 "Pushing to GitHub..."
git push origin main 2>&1 | tail -3
ok "Pushed"

# ─── Step 3: Build on server ───
step 3 "Building on server..."
ssh -o ConnectTimeout=10 root@$SERVER "
  cd $APP_DIR &&
  git pull origin main --quiet &&
  npx prisma generate 2>&1 | tail -1 &&
  npx next build --webpack 2>&1 | tail -10
"
ok "Build complete"

# ─── Step 4: Copy static + Restart ───
step 4 "Copying static files & restarting PM2..."
ssh root@$SERVER "
  cd $APP_DIR &&
  cp -r .next/static .next/standalone/.next/static &&
  cp -r public/* .next/standalone/public/ &&
  pm2 restart leaddrive-cloud
  pm2 save
"
ok "Static copied & PM2 restarted"

# ─── Step 5: Health check ───
step 5 "Health check..."
sleep 8
HEALTH_RESULT=$(ssh root@$SERVER "
  HTTP_CODE=\$(curl -s -o /dev/null -w '%{http_code}' $HEALTH_URL)
  CSS_URL=\$(curl -s $HEALTH_URL/login 2>/dev/null | grep -o '/_next/static/[^\"]*\.css' | head -1)
  if [ -n \"\$CSS_URL\" ]; then
    CSS_CODE=\$(curl -s -o /dev/null -w '%{http_code}' ${HEALTH_URL}\${CSS_URL})
  else
    CSS_CODE='NO_CSS_FOUND'
  fi
  echo \"PAGE:\$HTTP_CODE CSS:\$CSS_CODE\"
  if [ \"\$CSS_CODE\" = '200' ]; then
    echo 'DEPLOY_OK'
  elif [ \"\$HTTP_CODE\" = '307' ] || [ \"\$HTTP_CODE\" = '200' ]; then
    echo 'DEPLOY_OK'
  else
    echo 'DEPLOY_FAILED'
  fi
")

echo "  $HEALTH_RESULT"

if echo "$HEALTH_RESULT" | grep -q "DEPLOY_OK"; then
  ok "Deploy verified!"
elif echo "$HEALTH_RESULT" | grep -q "DEPLOY_FAILED"; then
  fail "App not responding! Check: ssh root@$SERVER 'pm2 logs leaddrive-v2 --lines 30'"
else
  echo -e "  ${YELLOW}⚠${NC} Could not fully verify — check manually"
fi

echo ""
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}  Deployed! https://app.leaddrivecrm.org${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
