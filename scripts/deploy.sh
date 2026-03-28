#!/bin/bash
# ═══════════════════════════════════════════════════════════
# LeadDrive CRM v2 — Quick Deploy to Production
# Usage: bash scripts/deploy.sh
# ═══════════════════════════════════════════════════════════
set -e

SERVER="178.156.249.177"
SSH_USER="root"
APP_DIR="/opt/leaddrive-v2"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

step() { echo -e "\n${YELLOW}[$1/5]${NC} $2"; }
ok()   { echo -e "  ${GREEN}OK${NC} $1"; }
fail() { echo -e "  ${RED}FAIL${NC} $1"; exit 1; }

# ─── Step 1: Pre-flight checks ───
step 1 "Pre-flight checks..."

# Check for uncommitted changes
if ! git diff --quiet HEAD 2>/dev/null; then
  echo -e "  ${YELLOW}WARNING:${NC} You have uncommitted changes!"
  echo "  Commit first or they won't be deployed."
  read -p "  Continue anyway? (y/N) " -n 1 -r
  echo
  [[ ! $REPLY =~ ^[Yy]$ ]] && exit 1
fi

# Quick TypeScript/import check (catches missing imports before deploy)
echo "  Checking build locally..."
npm run build > /tmp/leaddrive-build.log 2>&1
if [ $? -ne 0 ]; then
  echo -e "  ${RED}Build failed locally!${NC}"
  tail -20 /tmp/leaddrive-build.log
  fail "Fix build errors before deploying"
fi
ok "Local build passed"

# ─── Step 2: Push to GitHub ───
step 2 "Pushing to GitHub..."

CURRENT_BRANCH=$(git branch --show-current)
git push origin "$CURRENT_BRANCH":main 2>&1 | tail -3
ok "Code pushed to main"

# ─── Step 3: Pull on server ───
step 3 "Pulling code on server..."

ssh -o ConnectTimeout=10 "$SSH_USER@$SERVER" "cd $APP_DIR && git pull origin main 2>&1" | tail -5
ok "Code updated on server"

# ─── Step 4: Build on server (webpack for standalone) ───
step 4 "Building on server..."

ssh "$SSH_USER@$SERVER" bash -s << 'REMOTE'
set -e
cd /opt/leaddrive-v2

# Generate Prisma client (in case schema changed)
npx prisma generate 2>&1 | tail -2

# Run migrations if any
npx prisma migrate deploy 2>&1 | tail -2

# Build with webpack (Turbopack doesn't create standalone)
npx next build --webpack 2>&1 | tail -10

# Copy static files to standalone
cp -r .next/static .next/standalone/leaddrive-v2/.next/static 2>/dev/null || true
cp -r .next/static .next/standalone/.next/static 2>/dev/null || true
REMOTE

ok "Build complete"

# ─── Step 5: Restart PM2 ───
step 5 "Restarting application..."

ssh "$SSH_USER@$SERVER" bash -s << 'REMOTE'
pm2 restart leaddrive-v2 2>&1 | tail -3

# Wait for startup
sleep 3

# Health check
STATUS=$(pm2 jlist 2>/dev/null | node -e "
  let d='';process.stdin.on('data',c=>d+=c);
  process.stdin.on('end',()=>{
    try{const p=JSON.parse(d);console.log(p[0]?.pm2_env?.status||'unknown')}
    catch(e){console.log('unknown')}
  })
" 2>/dev/null)

HTTP=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3001 2>/dev/null || echo "000")

echo "  PM2: $STATUS | HTTP: $HTTP"

if [ "$HTTP" = "000" ]; then
  echo "  Server not responding yet, checking logs..."
  pm2 logs leaddrive-v2 --lines 5 --nostream 2>&1 | grep -v metadataBase
fi
REMOTE

ok "Deployed!"

echo ""
echo -e "${GREEN}═══════════════════════════════════════${NC}"
echo -e "${GREEN}  Deploy complete!${NC}"
echo -e "${GREEN}  https://leaddrive.cloud${NC}"
echo -e "${GREEN}═══════════════════════════════════════${NC}"
