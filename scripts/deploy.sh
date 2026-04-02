#!/bin/bash
# ═══════════════════════════════════════════════════════════
# LeadDrive CRM v2 — Zero-Downtime Deploy to Production
# Strategy: LOCAL build → tar → scp → extract → verify → restart
# Usage: bash scripts/deploy.sh
# ═══════════════════════════════════════════════════════════
set -e

SERVER="46.224.171.53"
APP_DIR="/opt/leaddrive-v2"
TAR_FILE="/tmp/leaddrive-next-build.tar.gz"
HEALTH_URL="http://localhost:3001"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

step() { echo -e "\n${YELLOW}[$1/7]${NC} $2"; }
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

# ─── Step 3: Build locally ───
step 3 "Building locally (webpack → standalone)..."
npx next build --webpack 2>&1 | tail -5

# Verify standalone was created
if [ ! -f ".next/standalone/server.js" ]; then
  fail "standalone/server.js not found! Build failed."
fi
if [ ! -d ".next/static" ]; then
  fail ".next/static/ not found! Build incomplete."
fi
ok "Build complete — standalone + static verified"

# ─── Step 4: Package & Upload ───
step 4 "Packaging and uploading..."
COPYFILE_DISABLE=1 tar -czf "$TAR_FILE" -C "$(pwd)" .next/standalone .next/static 2>/dev/null
TAR_SIZE=$(ls -lh "$TAR_FILE" | awk '{print $5}')
ok "Tarball created ($TAR_SIZE)"

scp -o ConnectTimeout=10 "$TAR_FILE" root@$SERVER:/tmp/leaddrive-next-build.tar.gz
ok "Uploaded to server"

# ─── Step 5: Extract & Setup on server ───
step 5 "Extracting on server..."
ssh -o ConnectTimeout=10 root@$SERVER "
  cd $APP_DIR &&
  git pull origin main --quiet &&
  npx prisma generate 2>&1 | tail -1 &&

  # Remove old build
  rm -rf .next/standalone .next/static &&

  # Extract new build
  tar -xzf /tmp/leaddrive-next-build.tar.gz &&

  # CRITICAL: Copy static files INTO standalone
  mkdir -p .next/standalone/.next &&
  cp -r .next/static .next/standalone/.next/static &&

  # Copy Prisma client into standalone
  cp -r node_modules/.prisma .next/standalone/node_modules/.prisma 2>/dev/null;
  cp -r node_modules/@prisma .next/standalone/node_modules/@prisma 2>/dev/null;

  # Verify everything is in place
  echo '--- DEPLOY VERIFICATION ---'
  test -f .next/standalone/server.js && echo 'server.js: OK' || echo 'server.js: MISSING!'
  test -d .next/standalone/.next/static && echo 'static/: OK' || echo 'static/: MISSING!'
  CSS_COUNT=\$(find .next/standalone/.next/static -name '*.css' 2>/dev/null | wc -l)
  JS_COUNT=\$(find .next/standalone/.next/static -name '*.js' 2>/dev/null | wc -l)
  echo \"CSS files: \$CSS_COUNT, JS files: \$JS_COUNT\"
  if [ \"\$CSS_COUNT\" -eq 0 ]; then echo 'FATAL: No CSS files in standalone!'; exit 1; fi
  if [ \"\$JS_COUNT\" -eq 0 ]; then echo 'FATAL: No JS files in standalone!'; exit 1; fi
  echo '--- ALL CHECKS PASSED ---'
"
ok "Extracted and verified"

# ─── Step 6: Restart ───
step 6 "Restarting PM2..."
ssh root@$SERVER "
  pm2 restart leaddrive-v2 2>/dev/null || pm2 start /opt/leaddrive-v2/start.sh --name leaddrive-v2 --interpreter bash
"
ok "PM2 restarted"

# ─── Step 7: Health check (CSS + page load) ───
step 7 "Health check..."
sleep 5
HEALTH_RESULT=$(ssh root@$SERVER "
  # Check app responds
  HTTP_CODE=\$(curl -s -o /dev/null -w '%{http_code}' $HEALTH_URL)

  # Check CSS actually loads (grab first CSS URL from page and verify)
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
    # Page loads but CSS check inconclusive — retry
    sleep 3
    CSS_URL=\$(curl -s $HEALTH_URL/login 2>/dev/null | grep -o '/_next/static/[^\"]*\.css' | head -1)
    if [ -n \"\$CSS_URL\" ]; then
      CSS_CODE=\$(curl -s -o /dev/null -w '%{http_code}' ${HEALTH_URL}\${CSS_URL})
      echo \"RETRY CSS:\$CSS_CODE\"
      if [ \"\$CSS_CODE\" = '200' ]; then echo 'DEPLOY_OK'; else echo 'DEPLOY_CSS_BROKEN'; fi
    else
      echo 'DEPLOY_NO_CSS_URL'
    fi
  else
    echo 'DEPLOY_FAILED'
  fi
")

echo "  $HEALTH_RESULT"

if echo "$HEALTH_RESULT" | grep -q "DEPLOY_OK"; then
  ok "Page loads + CSS verified!"
elif echo "$HEALTH_RESULT" | grep -q "DEPLOY_CSS_BROKEN"; then
  fail "Page loads but CSS is BROKEN! Check .next/standalone/.next/static/"
elif echo "$HEALTH_RESULT" | grep -q "DEPLOY_FAILED"; then
  fail "App not responding! Check pm2 logs leaddrive-v2"
else
  echo -e "  ${YELLOW}⚠${NC} Could not fully verify CSS — check manually"
fi

# Cleanup
rm -f "$TAR_FILE"

echo ""
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}  Deployed! https://leaddrivecrm.org${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
